// Statement-import helpers: merchant normalization, duplicate detection,
// and the previous-period / credit-card-cycle guard.

import { parseISO, startOfMonth, isBefore } from "date-fns";

export type SourceKind = "bank" | "credit_card";

export type ExistingTxn = {
  amount: string | number;
  occurred_at: string;
  merchant?: string | null;
};

export type ParsedRowLite = {
  date: string; // YYYY-MM-DD
  amount: number;
  merchant?: string | null;
};

/**
 * Expand one compact AI row ({d,a,t,m,c,p}) back into the full shape the rest of
 * the pipeline expects. Tolerant of the old verbose keys too, so a model that
 * ignores the compact instruction still works.
 */
export function expandCompactRow(r: any) {
  const t = r?.t ?? r?.type;
  const p = r?.p ?? r?.is_card_payment;
  return {
    date: String(r?.d ?? r?.date ?? "").slice(0, 10),
    amount: Number(r?.a ?? r?.amount) || 0,
    type: t === "i" || t === "income" ? "income" : "expense",
    merchant: r?.m ?? r?.merchant ?? null,
    description: r?.n ?? r?.description ?? null,
    category_suggestion: r?.c ?? r?.category_suggestion ?? null,
    is_card_payment: p === 1 || p === true,
  };
}

/**
 * Shrink raw PDF text before sending it to the AI:
 *  1. Drop boilerplate — keep only lines that look like a transaction (contain a
 *     date or a money amount). Addresses, marketing, legal text, page numbers go.
 *  2. Strip long reference/ID tokens (UPI/IMPS/account refs) that bloat remarks
 *     without helping categorization. Amounts (broken by commas/dots) are kept.
 *  3. Collapse whitespace.
 * Falls back to the (lightly cleaned) original if filtering removes too much, so
 * an unusual statement layout can never wipe out all the transactions.
 */
export function massageStatementText(text: string): string {
  const DATE = /\b(\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s?\d{1,2})\b/i;
  const AMOUNT = /(\d{1,3}(,\d{2,3})+(\.\d{1,2})?|\d+\.\d{2})/;

  const kept: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    let line = raw.replace(/\s+/g, " ").trim();
    if (!line) continue;
    if (!DATE.test(line) && !AMOUNT.test(line)) continue; // boilerplate
    line = line
      .replace(/\b[A-Za-z0-9]*\d{11,}[A-Za-z0-9]*\b/g, "#") // 11+ digit refs (amounts never run this long)
      .replace(/\b[A-Z0-9]{14,}\b/g, "#")                    // long alphanumeric codes
      .replace(/\s+/g, " ")
      .trim();
    kept.push(line);
  }

  const result = kept.join("\n");
  if (result.length < 100 || result.length < text.length * 0.1) {
    return text.replace(/[ \t]+/g, " ").replace(/\n{2,}/g, "\n").trim();
  }
  return result;
}

/**
 * Split raw statement text into chunks (on line boundaries) so long statements
 * aren't truncated by the model's input/output token limits, and so each list
 * the model parses stays short enough to extract reliably. Chunks never split a
 * line, so individual transaction rows stay intact.
 */
export function chunkStatementText(text: string, maxChars = 6000): string[] {
  if (text.length <= maxChars) return [text];

  const lines = text.split(/\r?\n/);
  // No usable line breaks (some PDFs emit one big blob) — hard-split by chars.
  if (lines.length < 3) {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += maxChars) chunks.push(text.slice(i, i + maxChars));
    return chunks;
  }

  const chunks: string[] = [];
  let cur = "";
  for (const line of lines) {
    if (cur.length + line.length + 1 > maxChars && cur.length > 0) {
      chunks.push(cur);
      cur = "";
    }
    cur += line + "\n";
  }
  if (cur.trim().length > 0) chunks.push(cur);
  return chunks;
}

/** Lowercase, strip punctuation, collapse whitespace. */
export function normalizeMerchant(s?: string | null): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Token-overlap similarity in [0,1] between two merchant strings. */
export function merchantSimilarity(a?: string | null, b?: string | null): number {
  const ta = new Set(normalizeMerchant(a).split(" ").filter(Boolean));
  const tb = new Set(normalizeMerchant(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / Math.min(ta.size, tb.size);
}

const DAY_MS = 86_400_000;

/**
 * A parsed row is a duplicate of an existing transaction when the amount matches
 * and the date is within ±3 days. If both have a merchant, also require decent
 * merchant similarity to avoid false positives on same-amount-same-day rows.
 */
export function isDuplicate(row: ParsedRowLite, existing: ExistingTxn[]): boolean {
  const rowTime = parseISO(row.date).getTime();
  return existing.some((e) => {
    if (Number(e.amount) !== Number(row.amount)) return false;
    const diffDays = Math.abs(parseISO(e.occurred_at).getTime() - rowTime) / DAY_MS;
    if (diffDays > 3) return false;
    if (row.merchant && e.merchant) {
      return merchantSimilarity(row.merchant, e.merchant) >= 0.5;
    }
    return true;
  });
}

/**
 * The first date of the still-open period. Rows on/after this are blocked from
 * import (current ongoing month for banks; current open billing cycle for cards).
 */
export function openPeriodStart(
  kind: SourceKind,
  cycleDay: number | null | undefined,
  today: Date = new Date()
): Date {
  if (kind === "credit_card" && cycleDay && cycleDay >= 1 && cycleDay <= 28) {
    const y = today.getFullYear();
    const m = today.getMonth();
    // most recent day-`cycleDay` that is <= today = start of the current open cycle
    return today.getDate() >= cycleDay
      ? new Date(y, m, cycleDay)
      : new Date(y, m - 1, cycleDay);
  }
  // bank (and cards without a cycle day): block the current calendar month
  return startOfMonth(today);
}

/** True when a row's date falls in the still-open period and cannot be imported. */
export function isRowBlocked(
  dateStr: string,
  kind: SourceKind,
  cycleDay: number | null | undefined,
  today: Date = new Date()
): boolean {
  const d = parseISO(dateStr);
  return !isBefore(d, openPeriodStart(kind, cycleDay, today)); // d >= openStart
}
