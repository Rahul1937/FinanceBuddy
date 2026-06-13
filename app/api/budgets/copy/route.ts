import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

// Copy all budgets from one month into another, skipping categories that are
// already budgeted in the target month (so re-running never creates duplicates).
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { from_month, to_month } = await request.json();
  const fromKey = String(from_month || "").slice(0, 7); // YYYY-MM
  const toKey = String(to_month || "").slice(0, 7);

  if (!/^\d{4}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}$/.test(toKey)) {
    return NextResponse.json({ error: "Invalid month." }, { status: 400 });
  }
  if (fromKey === toKey) {
    return NextResponse.json({ error: "Pick a different source month." }, { status: 400 });
  }

  const fromDate = `${fromKey}-01`;
  const toDate = `${toKey}-01`;

  const [{ data: source, error: srcErr }, { data: existing, error: existErr }] = await Promise.all([
    supabaseServer.from("budgets").select("*").eq("user_id", user.id).eq("month", fromDate),
    supabaseServer.from("budgets").select("category_id, name").eq("user_id", user.id).eq("month", toDate),
  ]);

  if (srcErr || existErr) {
    return NextResponse.json({ error: srcErr?.message || existErr?.message }, { status: 500 });
  }

  if (!source || source.length === 0) {
    return NextResponse.json({ copied: 0, skipped: 0, source: 0 });
  }

  // What's already in the target month? Category budgets keyed by category_id,
  // general (no-category) budgets keyed by name.
  const existingCatIds = new Set((existing ?? []).filter((b) => b.category_id).map((b) => b.category_id));
  const existingGeneralNames = new Set(
    (existing ?? []).filter((b) => !b.category_id).map((b) => (b.name || "").toLowerCase())
  );

  const toInsert = source
    .filter((b) =>
      b.category_id
        ? !existingCatIds.has(b.category_id)
        : !existingGeneralNames.has((b.name || "").toLowerCase())
    )
    .map((b) => ({
      user_id: user.id,
      name: b.name,
      amount: b.amount,
      category_id: b.category_id || null,
      month: toDate,
    }));

  if (toInsert.length === 0) {
    return NextResponse.json({ copied: 0, skipped: source.length, source: source.length });
  }

  const { error: insErr } = await supabaseServer.from("budgets").insert(toInsert);
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({
    copied: toInsert.length,
    skipped: source.length - toInsert.length,
    source: source.length,
  });
}
