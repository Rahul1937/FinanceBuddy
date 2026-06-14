"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PiggyBank, Pencil, Plus, Target } from "lucide-react";
import { useMonth } from "@/lib/context/MonthContext";
import { useRefreshListener, emitRefresh } from "@/lib/hooks/useRefreshBus";
import { useQuickAdd } from "@/lib/context/QuickAddContext";
import { getCategoryIcon } from "@/lib/utils/categories";

type Category = {
  id: string;
  name: string;
  color: string | null;
  is_savings?: boolean | null;
};

type Transaction = {
  id: string;
  amount: string;
  type: string;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  occurred_at: string;
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function SavingsPage() {
  const { activeMonth, activeMonthStr } = useMonth();
  const { open: openQuickAdd } = useQuickAdd();
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [showGoal, setShowGoal] = useState(false);
  const [goalInput, setGoalInput] = useState("");
  const [savingGoal, setSavingGoal] = useState(false);

  const monthLabel = format(activeMonth, "MMMM yyyy");

  const load = async () => {
    setLoading(true);
    const [catRes, txRes, goalRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/transactions"),
      fetch(`/api/savings?month=${activeMonthStr}`),
    ]);
    const [catPayload, txPayload, goalPayload] = await Promise.all([catRes.json(), txRes.json(), goalRes.json()]);
    setCategories(catPayload.categories ?? []);
    setTransactions(txPayload.transactions ?? []);
    setGoal(goalPayload.goal ?? null);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [activeMonthStr]);
  useRefreshListener(load);

  const savingsCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.is_savings).map((c) => c.id)),
    [categories]
  );
  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  // This month's transactions that went into a savings category.
  const monthSavings = useMemo(
    () =>
      transactions.filter(
        (t) => t.occurred_at.startsWith(activeMonthStr) && t.category_id && savingsCategoryIds.has(t.category_id)
      ),
    [transactions, activeMonthStr, savingsCategoryIds]
  );

  const totalSaved = useMemo(
    () => monthSavings.reduce((s, t) => s + Number(t.amount || 0), 0),
    [monthSavings]
  );

  // Per-savings-category totals (show every savings bucket, even at ₹0).
  const breakdown = useMemo(() => {
    const sums: Record<string, number> = {};
    monthSavings.forEach((t) => {
      if (!t.category_id) return;
      sums[t.category_id] = (sums[t.category_id] || 0) + Number(t.amount || 0);
    });
    return categories
      .filter((c) => c.is_savings)
      .map((c) => ({ id: c.id, name: c.name, color: c.color, value: sums[c.id] || 0 }))
      .sort((a, b) => b.value - a.value);
  }, [categories, monthSavings]);

  const pct = goal && goal > 0 ? Math.min(Math.round((totalSaved / goal) * 100), 100) : 0;
  const reached = goal != null && goal > 0 && totalSaved >= goal;
  const barColor = reached ? "var(--positive)" : "var(--brand)";

  const openGoalModal = () => {
    setGoalInput(goal != null ? String(goal) : "");
    setShowGoal(true);
  };

  const handleSaveGoal = async (e: FormEvent) => {
    e.preventDefault();
    const num = Number(goalInput);
    if (!Number.isFinite(num) || num < 0) { toast.error("Enter a valid goal amount."); return; }
    setSavingGoal(true);
    try {
      const res = await fetch("/api/savings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month: activeMonthStr, amount: num }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save goal.");
      setGoal(data.goal ?? num);
      setShowGoal(false);
      toast.success("Savings goal saved");
      emitRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save goal.");
    } finally {
      setSavingGoal(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5 p-5 lg:p-6">
        <div className="fb-skeleton h-9 w-44" />
        <div className="fb-skeleton h-40" />
        <div className="fb-skeleton h-56" />
      </div>
    );
  }

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Savings</h1>
          <p className="fb-page-sub">{monthLabel} · track what you set aside</p>
        </div>
        <button onClick={openGoalModal} className="fb-add-btn">
          <Target size={16} />
          {goal != null ? "Edit goal" : "Set goal"}
        </button>
      </div>

      {/* Hero progress card */}
      <div className="fb-card">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Saved this month</p>
            <p className="mt-1 font-mono text-3xl font-bold text-[var(--positive)]">{formatINR(totalSaved)}</p>
            {goal != null && goal > 0 ? (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                of {formatINR(goal)} goal
                {reached
                  ? " · 🎉 goal reached!"
                  : ` · ${formatINR(Math.max(goal - totalSaved, 0))} to go`}
              </p>
            ) : (
              <p className="mt-1 text-xs text-[var(--text-muted)]">No goal set for {monthLabel}</p>
            )}
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[var(--positive-soft)]">
            <PiggyBank size={22} className="text-[var(--positive)]" />
          </div>
        </div>

        {goal != null && goal > 0 && (
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: barColor }}>{pct}%</span>
              <span className="text-[var(--text-muted)]">{formatINR(totalSaved)} / {formatINR(goal)}</span>
            </div>
            <div className="fb-progress-bg">
              <div className="fb-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
            </div>
          </div>
        )}
      </div>

      {/* Breakdown by bucket */}
      <div className="fb-card">
        <div className="fb-card-title">
          Where it went
          <button onClick={openQuickAdd} className="fb-card-badge cursor-pointer transition hover:text-[var(--brand)]">
            <span className="inline-flex items-center gap-1"><Plus size={12} /> Add</span>
          </button>
        </div>

        {totalSaved === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-raised)] text-2xl">🏦</div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Nothing saved yet this month</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">
              Add a transaction with a savings category (Transfer to Savings, SIP, Stocks…).
            </p>
            <button onClick={openQuickAdd} className="fb-add-btn mt-4 text-xs">
              <Plus size={14} /> Add savings
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {breakdown.map((b) => {
              const share = totalSaved > 0 ? Math.round((b.value / totalSaved) * 100) : 0;
              return (
                <div key={b.id}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--text-primary)]">
                      {getCategoryIcon(b.name)} {b.name}
                    </span>
                    <span className="font-mono text-[var(--text-secondary)]">{formatINR(b.value)}</span>
                  </div>
                  <div className="fb-progress-bg">
                    <div className="fb-progress-fill" style={{ width: `${share}%`, background: b.color || "var(--positive)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent savings transactions */}
      {monthSavings.length > 0 && (
        <div className="fb-card">
          <div className="fb-card-title">
            Savings transactions
            <span className="fb-card-badge">{monthSavings.length} this month</span>
          </div>
          <div className="space-y-1">
            {monthSavings
              .slice()
              .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))
              .slice(0, 12)
              .map((t) => {
                const cat = t.category_id ? categoryMap[t.category_id] : null;
                return (
                  <div key={t.id} className="fb-tx-row">
                    <div className="fb-tx-icon" style={{ background: cat?.color ? `${cat.color}22` : "var(--positive-soft)" }}>
                      {cat ? getCategoryIcon(cat.name) : "🏦"}
                    </div>
                    <div className="fb-tx-info">
                      <div className="fb-tx-name">{t.merchant || t.notes || cat?.name || "Savings"}</div>
                      <div className="fb-tx-meta">{cat?.name ?? "Savings"} · {format(new Date(t.occurred_at), "d MMM")}</div>
                    </div>
                    <div className="fb-tx-amount income">{formatINR(Number(t.amount))}</div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Goal modal */}
      {showGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowGoal(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center gap-2">
              <Pencil size={16} className="text-[var(--brand)]" />
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Savings goal · {monthLabel}</h2>
            </div>

            <form onSubmit={handleSaveGoal} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Monthly goal
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5">
                  <span className="font-mono text-sm text-[var(--text-muted)]">₹</span>
                  <input
                    type="number" step="1" min="0" required autoFocus
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    placeholder="20000"
                    className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowGoal(false)}
                  className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingGoal}
                  className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:opacity-60"
                >
                  {savingGoal ? "Saving…" : "Save goal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
