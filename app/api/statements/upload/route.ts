import { NextRequest, NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";
import { subDays, addDays, parseISO } from "date-fns";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { aiConfigured, chatJSON } from "@/lib/ai/openai";
import { statementParserPrompt } from "@/lib/ai/prompts";
import {
  chunkStatementText,
  expandCompactRow,
  isDuplicate,
  isRowBlocked,
  massageStatementText,
  type SourceKind,
} from "@/lib/utils/statements";

export const runtime = "nodejs";
export const maxDuration = 120;

type Category = { id: string; name: string; exclude_from_spend: boolean | null };

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "Statement parsing needs an AI_API_KEY. Add one to your environment to enable imports." },
      { status: 503 }
    );
  }

  const form = await request.formData();
  const file = form.get("file") as File | null;
  const sourceId = String(form.get("source_id") || "");
  const password = String(form.get("password") || "") || undefined;

  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  if (!sourceId) return NextResponse.json({ error: "Choose a statement source first." }, { status: 400 });

  // Load + verify the source
  const { data: source } = await supabaseServer
    .from("statement_sources")
    .select("*")
    .eq("id", sourceId)
    .eq("user_id", user.id)
    .single();
  if (!source) return NextResponse.json({ error: "Statement source not found." }, { status: 404 });

  // Extract text from the PDF
  let text = "";
  try {
    const buf = new Uint8Array(await file.arrayBuffer());
    const pdf = await getDocumentProxy(buf, password ? { password } : undefined);
    const result = await extractText(pdf, { mergePages: true });
    text = (result.text as string) || "";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/password/i.test(msg)) {
      return NextResponse.json(
        { error: "This PDF is password protected. Enter the password and try again." },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Couldn't read this PDF file." }, { status: 400 });
  }

  if (text.trim().length < 40) {
    return NextResponse.json(
      { error: "Couldn't extract text — this looks like a scanned/image PDF. OCR isn't supported yet." },
      { status: 422 }
    );
  }

  // Categories for mapping suggestions
  const { data: catsData } = await supabaseServer
    .from("categories")
    .select("id, name, exclude_from_spend")
    .eq("user_id", user.id);
  const cats = (catsData ?? []) as Category[];
  const catByName = new Map(cats.map((c) => [c.name.toLowerCase().trim(), c]));
  const ccCat = catByName.get("credit card payment");

  // AI parse — token-aware. Groq's free tier caps tokens-per-minute (TPM=12000)
  // and counts the reserved max_tokens against each request, so we keep every
  // request safely under budget. A single call is ideal (least overhead); we
  // only split a statement when it's too large to parse in one request.
  const system = statementParserPrompt(source.kind as SourceKind, cats.map((c) => c.name));

  // Pre-filter to transaction rows + strip reference-number bloat so we send far
  // fewer tokens to the AI (and fit more of the statement per request).
  const aiText = massageStatementText(text);

  // Over-estimate tokens (chars / 3.5) so we never exceed the limit by accident.
  const estTokens = (s: string) => Math.ceil(s.length / 3.5);
  const TPM_BUDGET = 11000;                       // headroom under Groq's 12000 TPM
  const MIN_OUTPUT = 2000;                          // never reserve less than this
  const MAX_OUTPUT = 6000;                          // never reserve more than this
  const systemTokens = estTokens(system) + 80;     // + per-message overhead

  // Largest chunk whose (system + input + min-output) still fits the budget.
  const maxCharsPerChunk = Math.max(4000, (TPM_BUDGET - systemTokens - MIN_OUTPUT) * 3.5);
  const chunks = chunkStatementText(aiText, maxCharsPerChunk).slice(0, 12);

  const rawRows: any[] = [];
  let periodStartRaw: string | null = null;
  let periodEndRaw: string | null = null;
  try {
    for (const chunk of chunks) {
      // Reserve only the output the remaining budget allows (clamped to a range).
      const maxTokens = Math.min(
        MAX_OUTPUT,
        Math.max(MIN_OUTPUT, TPM_BUDGET - systemTokens - estTokens(chunk))
      );
      const parsed = await chatJSON(system, chunk, maxTokens);

      // Compact keys (tx/d/a/t/m/c/p) — tolerate verbose keys too.
      const txArr = Array.isArray(parsed?.tx)
        ? parsed.tx
        : Array.isArray(parsed?.transactions)
          ? parsed.transactions
          : [];
      for (const r of txArr) rawRows.push(expandCompactRow(r));

      const ps = typeof parsed?.ps === "string" ? parsed.ps : typeof parsed?.period_start === "string" ? parsed.period_start : null;
      const pe = typeof parsed?.pe === "string" ? parsed.pe : typeof parsed?.period_end === "string" ? parsed.period_end : null;
      if (!periodStartRaw && ps) periodStartRaw = ps;
      if (pe) periodEndRaw = pe;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI parsing failed.";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Existing transactions in the statement window (for dedup)
  const dates = rawRows.map((r) => String(r.date || "").slice(0, 10)).filter(Boolean).sort();
  let existing: { amount: number; occurred_at: string; merchant: string | null }[] = [];
  if (dates.length) {
    const from = subDays(parseISO(dates[0]), 3).toISOString();
    const to = addDays(parseISO(dates[dates.length - 1]), 3).toISOString();
    const { data: ex } = await supabaseServer
      .from("transactions")
      .select("amount, occurred_at, merchant")
      .eq("user_id", user.id)
      .gte("occurred_at", from)
      .lte("occurred_at", to);
    existing = (ex ?? []) as any;
  }

  const rows = rawRows
    .map((r, i) => {
      const amount = Math.abs(Number(r.amount) || 0);
      const date = String(r.date || "").slice(0, 10);
      const type = r.type === "income" ? "income" : "expense";
      const merchant = r.merchant ? String(r.merchant).trim() : null;
      const description = r.description ? String(r.description).trim() : null;

      let categoryId: string | null = null;
      let categoryName: string | null = null;
      let excludeFromSpend = false;

      if (r.is_card_payment && ccCat) {
        categoryId = ccCat.id;
        categoryName = ccCat.name;
        excludeFromSpend = true;
      } else {
        const match = catByName.get(String(r.category_suggestion || "").toLowerCase().trim());
        if (match) {
          categoryId = match.id;
          categoryName = match.name;
          excludeFromSpend = !!match.exclude_from_spend;
        } else {
          categoryName = r.category_suggestion ? String(r.category_suggestion) : null;
        }
      }

      const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date);
      const blocked = !validDate || isRowBlocked(date, source.kind as SourceKind, source.cycle_day);
      const blockedReason = blocked
        ? source.kind === "credit_card"
          ? "In the current open billing cycle"
          : "In the current month"
        : null;
      const duplicate = !blocked && amount > 0 ? isDuplicate({ date, amount, merchant }, existing) : false;

      return {
        tempId: i,
        date,
        amount,
        type,
        merchant,
        description,
        categoryId,
        categoryName,
        excludeFromSpend,
        isCardPayment: !!r.is_card_payment,
        blocked,
        blockedReason,
        duplicate,
      };
    })
    .filter((r) => r.amount > 0 && /^\d{4}-\d{2}-\d{2}$/.test(r.date));

  const duplicateCount = rows.filter((r) => r.duplicate && !r.blocked).length;
  const importableCount = rows.filter((r) => !r.blocked && !r.duplicate).length;

  // Record the import (review stage)
  const periodStart = periodStartRaw && /^\d{4}-\d{2}-\d{2}$/.test(periodStartRaw) ? periodStartRaw : null;
  const periodEnd = periodEndRaw && /^\d{4}-\d{2}-\d{2}$/.test(periodEndRaw) ? periodEndRaw : null;

  const { data: imp, error: impErr } = await supabaseServer
    .from("statement_imports")
    .insert([
      {
        user_id: user.id,
        source_id: sourceId,
        file_name: file.name,
        period_start: periodStart,
        period_end: periodEnd,
        parsed_count: rows.length,
        duplicate_count: duplicateCount,
        status: "review",
      },
    ])
    .select()
    .single();

  if (impErr) return NextResponse.json({ error: impErr.message }, { status: 500 });

  return NextResponse.json({
    importId: imp.id,
    sourceId,
    sourceKind: source.kind,
    sourceName: source.name,
    periodStart,
    periodEnd,
    parsedCount: rows.length,
    duplicateCount,
    importableCount,
    rows,
  });
}
