"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Plus, TrendingUp, Shield } from "lucide-react";
import { toast } from "sonner";
import SummaryCard from "@/components/dashboard/SummaryCard";
import DonutChart from "@/components/dashboard/DonutChart";
import TransactionList from "@/components/dashboard/TransactionList";
import UpcomingBills from "@/components/dashboard/UpcomingBills";
import CashflowChart from "@/components/reports/CashflowChart";
import { useMonth } from "@/lib/context/MonthContext";
import { useRefreshListener, emitRefresh } from "@/lib/hooks/useRefreshBus";
import { excludedCategoryIds, isSpend } from "@/lib/utils/spend";
import { dueWithin, type RecurringRule } from "@/lib/utils/recurring";

type Transaction = {
  id: string;
  amount: string;
  currency: string;
  type: string;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  occurred_at: string;
  exclude_from_spend?: boolean | null;
};

type Budget = {
  id: string;
  name: string;
  amount: string;
  month: string;
  category_id: string | null;
};

type Category = {
  id: string;
  name: string;
  color: string | null;
  exclude_from_spend?: boolean | null;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const { activeMonth, activeMonthStr } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recurring, setRecurring] = useState<RecurringRule[]>([]);
  const [cashflow, setCashflow] = useState<{ month: string; income: number; spend: number }[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const currentMonthLabel = format(activeMonth, "MMMM yyyy");

  const load = async () => {
    setLoading(true);
    const [txRes, budgetRes, categoryRes, recurringRes, reportsRes] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/budgets"),
      fetch("/api/categories"),
      fetch("/api/recurring"),
      fetch("/api/reports"),
    ]);
    const [txPayload, budgetPayload, categoryPayload, recurringPayload, reportsPayload] = await Promise.all([
      txRes.json(),
      budgetRes.json(),
      categoryRes.json(),
      recurringRes.json(),
      reportsRes.json(),
    ]);
    setTransactions(txPayload.transactions ?? []);
    setBudgets(budgetPayload.budgets ?? []);
    setCategories(categoryPayload.categories ?? []);
    setRecurring(recurringPayload.rules ?? []);
    setCashflow((reportsPayload.months ?? []).slice(-6));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRefreshListener(load);

  const postBill = async (id: string) => {
    setPostingId(id);
    try {
      const res = await fetch(`/api/recurring/${id}/post`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed.");
      toast.success("Transaction added");
      emitRefresh();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setPostingId(null);
    }
  };

  const upcomingBills = useMemo(
    () => recurring.filter((r) => dueWithin(r, 7)).sort((a, b) => a.next_due.localeCompare(b.next_due)),
    [recurring]
  );

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const excludedCats = useMemo(() => excludedCategoryIds(categories), [categories]);

  // Uncategorised spend is attributed to the "Miscellaneous" category so it
  // still shows in the donut and can be budgeted.
  const miscCategoryId = useMemo(
    () => categories.find((c) => c.name.toLowerCase() === "miscellaneous")?.id ?? null,
    [categories]
  );

  const monthlyTransactions = useMemo(
    () => transactions.filter((t) => t.occurred_at?.startsWith(activeMonthStr)),
    [transactions, activeMonthStr]
  );

  const totalSpent = useMemo(
    () => monthlyTransactions.filter((t) => isSpend(t, excludedCats))
          .reduce((s, t) => s + Number(t.amount || 0), 0),
    [monthlyTransactions, excludedCats]
  );

  const totalIncome = useMemo(
    () => monthlyTransactions.filter((t) => t.type === "income")
          .reduce((s, t) => s + Number(t.amount || 0), 0),
    [monthlyTransactions]
  );

  const currentBudgets = useMemo(
    () => budgets.filter((b) => b.month.startsWith(activeMonthStr)),
    [budgets, activeMonthStr]
  );

  const totalBudget = useMemo(
    () => currentBudgets.reduce((s, b) => s + Number(b.amount || 0), 0),
    [currentBudgets]
  );

  const budgetPercent = totalBudget > 0
    ? Math.min(Math.round((totalSpent / totalBudget) * 100), 999)
    : 0;

  const spentArcColor =
    budgetPercent > 100 ? "var(--danger)" :
    budgetPercent > 80  ? "var(--warning)" :
    "var(--positive)";

  const budgetSpendMap = useMemo(() => {
    return monthlyTransactions.reduce<Record<string, number>>((acc, t) => {
      if (!isSpend(t, excludedCats)) return acc;
      const key = t.category_id || miscCategoryId;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + Number(t.amount || 0);
      return acc;
    }, {});
  }, [monthlyTransactions, excludedCats, miscCategoryId]);

  const chartData = useMemo(
    () =>
      categories
        .map((c) => ({
          id: c.id,
          label: c.name,
          value: Math.round(budgetSpendMap[c.id] || 0),
          color: c.color || "#818cf8",
        }))
        .filter((d) => d.value > 0),
    [categories, budgetSpendMap]
  );

  const recentTransactions = useMemo(
    () =>
      monthlyTransactions.slice(0, 8).map((t) => ({
        ...t,
        category_name: t.category_id ? categoryMap[t.category_id]?.name : null,
      })),
    [monthlyTransactions, categoryMap]
  );

  if (loading) {
    return (
      <div className="space-y-5 p-5 lg:p-6">
        <div className="fb-skeleton h-9 w-52" />
        <div className="fb-summary-grid">
          {[0, 1, 2].map((i) => <div key={i} className="fb-skeleton h-28" />)}
        </div>
        <div className="fb-mid-row">
          <div className="fb-skeleton h-64" />
          <div className="fb-skeleton h-64" />
        </div>
        <div className="fb-skeleton h-40" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Page header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Dashboard</h1>
          <p className="fb-page-sub">{currentMonthLabel} · Overview of your finances</p>
        </div>
        <Link href="/transactions/new" className="fb-add-btn">
          <Plus size={16} />
          Add expense
        </Link>
      </div>

      {/* Summary cards */}
      <div className="fb-summary-grid">
        <SummaryCard
          label="Total spent"
          value={formatINR(totalSpent)}
          sub={totalBudget ? `of ${formatINR(totalBudget)} budget` : "No budget set"}
          trend={null}
          arcPercent={budgetPercent}
          arcColor={spentArcColor}
        />
        <SummaryCard
          label="Income"
          value={formatINR(totalIncome)}
          sub={`Total income in ${format(activeMonth, "MMMM")}`}
          valueColor="var(--positive)"
          icon={<TrendingUp size={16} className="text-[var(--positive)]" />}
        />
        <SummaryCard
          label="Budget health"
          value={totalBudget ? `${100 - Math.min(budgetPercent, 100)}%` : "–"}
          sub={`${currentBudgets.length} budget${currentBudgets.length !== 1 ? "s" : ""} active`}
          valueColor={
            budgetPercent > 100 ? "var(--danger)" :
            budgetPercent > 80  ? "var(--warning)" :
            "var(--positive)"
          }
          icon={<Shield size={16} className="text-[var(--positive)]" />}
        />
      </div>

      {/* Charts + transactions */}
      <div className="fb-mid-row">
        <div className="fb-card">
          <div className="fb-card-title">
            Spending by category
            <span className="fb-card-badge">{currentMonthLabel}</span>
          </div>
          <DonutChart slices={chartData} />
        </div>

        <div className="fb-card">
          <div className="fb-card-title">
            Recent transactions
            <span className="fb-card-badge">{monthlyTransactions.length} this month</span>
          </div>
          <TransactionList items={recentTransactions} />
          {monthlyTransactions.length > 8 && (
            <Link
              href="/transactions"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-[var(--surface-border)] py-2 text-xs font-medium text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              View all {monthlyTransactions.length} transactions →
            </Link>
          )}
        </div>
      </div>

      {/* Cashflow overview */}
      {cashflow.length >= 2 && (
        <div className="fb-card">
          <div className="fb-card-title">
            Cashflow
            <Link href="/reports" className="fb-card-badge cursor-pointer transition hover:text-[var(--brand)]">
              Reports →
            </Link>
          </div>
          <CashflowChart data={cashflow} height={220} />
        </div>
      )}

      {/* Upcoming bills */}
      <UpcomingBills rules={upcomingBills} categoryMap={categoryMap} postingId={postingId} onPost={postBill} />

      {/* Budget bars */}
      {currentBudgets.length > 0 && (
        <div className="fb-card">
          <div className="fb-card-title">
            Budget overview
            <Link href="/budgets" className="fb-card-badge cursor-pointer hover:text-[var(--brand)] transition">
              Manage →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {currentBudgets.map((budget) => {
              const cat = budget.category_id ? categoryMap[budget.category_id] : null;
              const spent = budget.category_id ? budgetSpendMap[budget.category_id] || 0 : 0;
              const amount = Number(budget.amount || 0);
              const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
              const isOver = spent > amount;
              const isWarn = !isOver && pct > 80;
              const barColor = isOver ? "var(--danger)" : isWarn ? "var(--warning)" : "var(--positive)";

              return (
                <div key={budget.id} className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-[var(--text-primary)]">
                      {cat?.name || budget.name || "General"}
                    </span>
                    <span
                      className="text-xs font-semibold"
                      style={{ color: isOver ? "var(--danger)" : isWarn ? "var(--warning)" : "var(--text-muted)" }}
                    >
                      {Math.round(pct)}%
                    </span>
                  </div>
                  <div className="fb-progress-bg">
                    <div
                      className="fb-progress-fill"
                      style={{ width: `${pct}%`, background: barColor }}
                    />
                  </div>
                  <div className="mt-1.5 flex items-center justify-between text-[11px]">
                    <span className="font-mono text-[var(--text-muted)]">₹{spent.toLocaleString("en-IN")}</span>
                    <span className="font-mono text-[var(--text-muted)]">of ₹{amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
