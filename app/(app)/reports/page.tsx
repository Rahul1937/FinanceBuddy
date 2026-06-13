"use client";

import { useEffect, useMemo, useState } from "react";
import { format, subMonths, getDaysInMonth, parseISO } from "date-fns";
import { Download, BarChart3 } from "lucide-react";
import { useMonth } from "@/lib/context/MonthContext";
import { excludedCategoryIds, isSpend } from "@/lib/utils/spend";
import { transactionsToCSV, downloadCSV } from "@/lib/utils/csv";
import CashflowChart from "@/components/reports/CashflowChart";
import TrendChart from "@/components/reports/TrendChart";
import CategoryBars from "@/components/reports/CategoryBars";
import ComparisonCards from "@/components/reports/ComparisonCards";

type MonthRow = { month: string; income: number; spend: number };
type CatRow = { name: string; total: number };
type Category = { id: string; name: string; color: string | null; exclude_from_spend?: boolean | null };
type Transaction = {
  id: string; amount: string; type: string; category_id: string | null;
  merchant: string | null; notes: string | null; occurred_at: string; exclude_from_spend?: boolean | null;
};

export default function ReportsPage() {
  const { activeMonth, activeMonthStr } = useMonth();
  const [months, setMonths] = useState<MonthRow[]>([]);
  const [categoryTotals, setCategoryTotals] = useState<CatRow[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const [rRes, txRes, cRes] = await Promise.all([
        fetch("/api/reports"), fetch("/api/transactions"), fetch("/api/categories"),
      ]);
      const [r, tx, c] = await Promise.all([rRes.json(), txRes.json(), cRes.json()]);
      setMonths(r.months ?? []);
      setCategoryTotals(r.categoryTotals ?? []);
      setTransactions(tx.transactions ?? []);
      setCategories(c.categories ?? []);
      setLoading(false);
    };
    load();
  }, []);

  const excludedCats = useMemo(() => excludedCategoryIds(categories), [categories]);
  const catNameMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c.name])), [categories]);

  const monthLabel = format(activeMonth, "MMMM yyyy");
  const prevMonthStr = format(subMonths(activeMonth, 1), "yyyy-MM");
  const current = useMemo(() => months.find((m) => m.month === activeMonthStr) ?? null, [months, activeMonthStr]);
  const previous = useMemo(() => months.find((m) => m.month === prevMonthStr) ?? null, [months, prevMonthStr]);

  const daysInMonth = getDaysInMonth(activeMonth);
  const hasRawForMonth = useMemo(
    () => transactions.some((t) => t.occurred_at?.startsWith(activeMonthStr)),
    [transactions, activeMonthStr]
  );
  const dailyTrend = useMemo(() => {
    const arr = Array.from({ length: daysInMonth }, (_, i) => ({ day: i + 1, spend: 0 }));
    for (const t of transactions) {
      if (!t.occurred_at?.startsWith(activeMonthStr) || !isSpend(t, excludedCats)) continue;
      const day = Number(t.occurred_at.slice(8, 10));
      if (day >= 1 && day <= daysInMonth) arr[day - 1].spend += Number(t.amount || 0);
    }
    return arr;
  }, [transactions, activeMonthStr, daysInMonth, excludedCats]);

  const exportCSV = () => {
    const csv = transactionsToCSV(transactions, (id) => catNameMap[id ?? ""] ?? "");
    downloadCSV(`finance-buddy-transactions.csv`, csv);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand)]" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 lg:p-6">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Reports</h1>
          <p className="fb-page-sub">Cashflow, savings and spending trends · {monthLabel} vs last month</p>
        </div>
        <button onClick={exportCSV} className="fb-btn text-sm"><Download size={14} className="mr-1.5" /> Export CSV</button>
      </div>

      {/* This month vs last */}
      <ComparisonCards current={current} previous={previous} />

      {/* Cashflow + savings */}
      <div className="fb-card">
        <div className="fb-card-title">
          <span className="flex items-center gap-2"><BarChart3 size={15} /> Cashflow & net savings</span>
          <span className="fb-card-badge">last {months.length} mo</span>
        </div>
        {months.length < 2 ? (
          <p className="py-10 text-center text-sm text-[var(--text-muted)]">
            Not enough history yet — cashflow trends appear once you have a couple of months of data.
          </p>
        ) : (
          <CashflowChart data={months} />
        )}
      </div>

      <div className="fb-mid-row">
        {/* Category breakdown */}
        <div className="fb-card">
          <div className="fb-card-title">
            Top categories
            <span className="fb-card-badge">last {months.length} mo</span>
          </div>
          <CategoryBars data={categoryTotals} />
        </div>

        {/* Daily spend this month */}
        <div className="fb-card">
          <div className="fb-card-title">
            Daily spend
            <span className="fb-card-badge">{format(activeMonth, "MMM yyyy")}</span>
          </div>
          {hasRawForMonth ? (
            <TrendChart data={dailyTrend} />
          ) : (
            <p className="py-10 text-center text-sm text-[var(--text-muted)]">
              Daily breakdown is only kept for the current and previous month.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
