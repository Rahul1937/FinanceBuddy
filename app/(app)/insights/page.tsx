"use client";

import { useEffect, useMemo, useState } from "react";
import { Sparkles, RefreshCw, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { useMonth } from "@/lib/context/MonthContext";
import { excludedCategoryIds, isSpend } from "@/lib/utils/spend";

type Transaction = {
  id: string;
  amount: string;
  type: string;
  category_id: string | null;
  merchant: string | null;
  occurred_at: string;
  exclude_from_spend?: boolean | null;
};

type Category = { id: string; exclude_from_spend?: boolean | null };

type Budget = {
  id: string;
  name: string;
  amount: string;
  month: string;
  category_id: string | null;
};

type Insights = {
  summary: string;
  tips: string[];
};

type InsightState = "idle" | "loading" | "done" | "error";

export default function InsightsPage() {
  const { activeMonth, activeMonthStr } = useMonth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [insightState, setInsightState] = useState<InsightState>("idle");
  const [insights, setInsights] = useState<Insights | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const monthLabel = format(activeMonth, "MMMM yyyy");

  useEffect(() => {
    const load = async () => {
      setLoadingData(true);
      const [txRes, budgetRes, catRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);
      const [txPayload, budgetPayload, catPayload] = await Promise.all([
        txRes.json(), budgetRes.json(), catRes.json(),
      ]);
      setTransactions(txPayload.transactions ?? []);
      setBudgets(budgetPayload.budgets ?? []);
      setCategories(catPayload.categories ?? []);
      setLoadingData(false);
    };
    load();
  }, []);

  const monthlyTransactions = useMemo(
    () => transactions.filter((t) => t.occurred_at?.startsWith(activeMonthStr)),
    [transactions, activeMonthStr]
  );

  const monthlyBudgets = useMemo(
    () => budgets.filter((b) => b.month.startsWith(activeMonthStr)),
    [budgets, activeMonthStr]
  );

  const excludedCats = useMemo(() => excludedCategoryIds(categories), [categories]);

  const totalSpent = useMemo(
    () => monthlyTransactions.filter((t) => isSpend(t, excludedCats)).reduce((s, t) => s + Number(t.amount), 0),
    [monthlyTransactions, excludedCats]
  );

  const totalBudget = useMemo(
    () => monthlyBudgets.reduce((s, b) => s + Number(b.amount), 0),
    [monthlyBudgets]
  );

  const generate = async () => {
    setInsightState("loading");
    setErrorMsg("");
    setInsights(null);
    try {
      const res = await fetch("/api/ai/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month: monthLabel,
          transactions: monthlyTransactions,
          budgets: monthlyBudgets,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to generate insights.");
      }
      setInsights({ summary: data.summary, tips: data.tips });
      setInsightState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setInsightState("error");
    }
  };

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">AI Insights</h1>
          <p className="fb-page-sub">{monthLabel} · Powered by AI</p>
        </div>
        {insightState === "done" && (
          <button onClick={generate} className="fb-add-btn">
            <RefreshCw size={14} />
            Regenerate
          </button>
        )}
      </div>

      {/* Spending summary strip */}
      {!loadingData && monthlyTransactions.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Transactions</p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{monthlyTransactions.length}</p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total spent</p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">₹{totalSpent.toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">vs Budget</p>
            <p
              className="mt-1 font-mono text-xl font-bold"
              style={{ color: totalBudget > 0 && totalSpent > totalBudget ? "var(--danger)" : "var(--brand)" }}
            >
              {totalBudget > 0 ? `${Math.round((totalSpent / totalBudget) * 100)}%` : "–"}
            </p>
          </div>
        </div>
      )}

      {/* Main insights card */}
      <div className="fb-card">
        {insightState === "idle" && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
              <Sparkles size={28} className="text-[var(--brand)]" />
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)]">
              Ready to analyse {monthLabel}
            </p>
            <p className="mt-1.5 max-w-xs text-sm text-[var(--text-muted)]">
              Get AI-powered insights based on your spending patterns and budget performance.
            </p>
            {monthlyTransactions.length === 0 ? (
              <p className="mt-4 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-2.5 text-sm text-[var(--text-muted)]">
                No transactions found for {monthLabel}. Add some transactions first.
              </p>
            ) : (
              <button onClick={generate} className="fb-add-btn mt-6">
                <Sparkles size={15} />
                Generate insights
              </button>
            )}
          </div>
        )}

        {insightState === "loading" && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--brand-soft)]">
              <Sparkles size={28} className="animate-pulse text-[var(--brand)]" />
            </div>
            <p className="text-sm font-medium text-[var(--text-primary)]">Analysing your spending…</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">This takes a few seconds</p>
            {/* Skeleton */}
            <div className="mt-8 w-full max-w-md space-y-3">
              {[80, 65, 72].map((w, i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded-full bg-[var(--surface-raised)]"
                  style={{ width: `${w}%`, margin: "0 auto" }}
                />
              ))}
            </div>
          </div>
        )}

        {insightState === "error" && (
          <div className="flex flex-col items-center justify-center py-14 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(220,38,38,0.10)]">
              <AlertTriangle size={28} className="text-[var(--danger)]" />
            </div>
            <p className="text-base font-semibold text-[var(--text-primary)]">Could not generate insights</p>
            <p className="mt-1.5 max-w-xs text-sm text-[var(--text-muted)]">{errorMsg}</p>
            <button onClick={generate} className="fb-add-btn mt-5">
              <RefreshCw size={14} />
              Try again
            </button>
          </div>
        )}

        {insightState === "done" && insights && (
          <div>
            {/* Header */}
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
                <Sparkles size={18} className="text-[var(--brand)]" />
              </div>
              <p className="text-base font-semibold text-[var(--text-primary)]">
                {monthLabel} spending summary
              </p>
            </div>

            {/* Summary */}
            <p className="text-sm leading-relaxed text-[var(--text-secondary)] mb-5">
              {insights.summary}
            </p>

            {/* Tips */}
            <div className="space-y-3">
              {insights.tips.map((tip, i) => (
                <div
                  key={i}
                  className="flex gap-3 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3"
                >
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)]">
                    <span className="text-[10px] font-bold text-[var(--brand)]">{i + 1}</span>
                  </div>
                  <p className="text-sm text-[var(--text-secondary)]">{tip}</p>
                </div>
              ))}
            </div>

            <button
              onClick={generate}
              className="mt-5 flex items-center gap-1.5 text-xs text-[var(--text-muted)] transition hover:text-[var(--text-secondary)]"
            >
              <RefreshCw size={11} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Tip about AI key */}
      <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-4 py-3">
        <p className="text-xs text-[var(--text-muted)]">
          <span className="font-semibold text-[var(--text-secondary)]">AI insights</span> require an{" "}
          <span className="font-mono">OPENAI_API_KEY</span> in your environment variables. Add it to{" "}
          <span className="font-mono">.env</span> to enable this feature.
        </p>
      </div>
    </div>
  );
}
