import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { isRowBlocked, type SourceKind } from "@/lib/utils/statements";

type IncomingRow = {
  date: string;
  amount: number;
  type: string;
  merchant?: string | null;
  description?: string | null;
  categoryId?: string | null;
  excludeFromSpend?: boolean;
};

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const body = await request.json();
  const rows: IncomingRow[] = Array.isArray(body?.rows) ? body.rows : [];

  // Verify the import belongs to the user, and grab its source
  const { data: imp } = await supabaseServer
    .from("statement_imports")
    .select("*, statement_sources(kind, cycle_day)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!imp) return NextResponse.json({ error: "Import not found." }, { status: 404 });

  const source = (imp as any).statement_sources as { kind: SourceKind; cycle_day: number | null } | null;

  // Re-apply the period guard server-side (never trust the client here)
  const valid = rows.filter((r) => {
    const amt = Math.abs(Number(r.amount) || 0);
    if (!amt || !/^\d{4}-\d{2}-\d{2}$/.test(r.date)) return false;
    if (source && isRowBlocked(r.date, source.kind, source.cycle_day)) return false;
    return true;
  });

  if (valid.length === 0) {
    return NextResponse.json({ error: "No valid transactions to import." }, { status: 400 });
  }

  const inserts = valid.map((r) => ({
    user_id: user.id,
    amount: Math.abs(Number(r.amount)),
    currency: "INR",
    type: r.type === "income" ? "income" : "expense",
    category_id: r.categoryId || null,
    merchant: r.merchant || null,
    notes: r.description || null,
    occurred_at: `${r.date}T00:00:00.000Z`,
    source_id: imp.source_id,
    import_id: id,
    exclude_from_spend: !!r.excludeFromSpend,
  }));

  const { error: insErr } = await supabaseServer.from("transactions").insert(inserts);
  if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });

  await supabaseServer
    .from("statement_imports")
    .update({ imported_count: inserts.length, status: "done" })
    .eq("id", id)
    .eq("user_id", user.id);

  return NextResponse.json({ imported: inserts.length });
}
