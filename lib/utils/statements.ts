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
