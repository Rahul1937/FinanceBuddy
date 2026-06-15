import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

// Combined monthly report data. Reads rolled-up history from monthly_summaries
// and the recent raw transactions, merging them so reports span beyond the raw
// retention window (current + previous 2 months). Raw is the source of truth for
// any month it has data for; summaries fill in the older (pruned) months.
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: summaries }, { data: txns }, { data: cats }] = await Promise.all([
    supabaseServer
      .from("monthly_summaries")
      .select("month, category_name, type, total, exclude_from_spend")
      .eq("user_id", user.id),
    supabaseServer
      .from("transactions")
      .select("amount, type, category_id, occurred_at, exclude_from_spend")
      .eq("user_id", user.id),
    supabaseServer.from("categories").select("id, name, exclude_from_spend").eq("user_id", user.id),
  ]);

  const catName = new Map((cats ?? []).map((c) => [c.id, c.name]));
  const excluded = new Set((cats ?? []).filter((c) => c.exclude_from_spend).map((c) => c.id));

  // Aggregate raw transactions by YYYY-MM
  const rawByMonth: Record<string, { income: number; spend: number; cats: Record<string, number> }> = {};
  for (const t of txns ?? []) {
    const m = (t.occurred_at || "").slice(0, 7);
    if (!m) continue;
    (rawByMonth[m] ||= { income: 0, spend: 0, cats: {} });
    const amt = Number(t.amount) || 0;
    const isExcluded = !!t.exclude_from_spend || (!!t.category_id && excluded.has(t.category_id));
    if (t.type === "income" && !isExcluded) rawByMonth[m].income += amt;
    else if (t.type === "expense" && !isExcluded) {
      rawByMonth[m].spend += amt;
      const name = (t.category_id && catName.get(t.category_id)) || "Uncategorized";
      rawByMonth[m].cats[name] = (rawByMonth[m].cats[name] || 0) + amt;
    }
  }
  const rawMonths = new Set(Object.keys(rawByMonth));

  const monthMap: Record<string, { income: number; spend: number }> = {};
  const catTotals: Record<string, number> = {};

  // Summaries — only for months that don't have raw data (avoid double count)
  for (const s of summaries ?? []) {
    const m = (s.month || "").slice(0, 7);
    if (!m || rawMonths.has(m) || s.exclude_from_spend) continue;
    (monthMap[m] ||= { income: 0, spend: 0 });
    const total = Number(s.total) || 0;
    if (s.type === "income") monthMap[m].income += total;
    else if (s.type === "expense") {
      monthMap[m].spend += total;
      const name = s.category_name || "Uncategorized";
      catTotals[name] = (catTotals[name] || 0) + total;
    }
  }

  // Raw months (truth)
  for (const m of rawMonths) {
    monthMap[m] = { income: rawByMonth[m].income, spend: rawByMonth[m].spend };
    for (const [name, total] of Object.entries(rawByMonth[m].cats)) {
      catTotals[name] = (catTotals[name] || 0) + total;
    }
  }

  const months = Object.keys(monthMap)
    .sort()
    .slice(-12)
    .map((m) => ({
      month: m,
      income: Math.round(monthMap[m].income),
      spend: Math.round(monthMap[m].spend),
    }));

  const categoryTotals = Object.entries(catTotals)
    .map(([name, total]) => ({ name, total: Math.round(total) }))
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ months, categoryTotals });
}
