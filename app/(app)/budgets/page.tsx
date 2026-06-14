"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, ChevronDown, CalendarPlus } from "lucide-react";
import BudgetCard from "@/components/budgets/BudgetCard";
import { useMonth } from "@/lib/context/MonthContext";
import { format, subMonths } from "date-fns";
import { getCategoryIcon } from "@/lib/utils/categories";
import { excludedCategoryIds, isSpend } from "@/lib/utils/spend";
import { useRefreshListener, emitRefresh } from "@/lib/hooks/useRefreshBus";

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

type Transaction = {
  amount: string;
  type: string;
  category_id: string | null;
  occurred_at: string;
  exclude_from_spend?: boolean | null;
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function BudgetsPage() {
  const { activeMonth, activeMonthStr } = useMonth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ category_id: "", amount: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [copyFrom, setCopyFrom] = useState("");
  const [copying, setCopying] = useState(false);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const load = async () => {
    setLoading(true);
    const [catRes, budgetRes, txRes] = await Promise.all([
      fetch("/api/categories"),
      fetch("/api/budgets"),
      fetch("/api/transactions"),
    ]);
    const [catPayload, budgetPayload, txPayload] = await Promise.all([
      catRes.json(), budgetRes.json(), txRes.json(),
    ]);
    setCategories(catPayload.categories ?? []);
    setBudgets(budgetPayload.budgets ?? []);
    setTransactions(txPayload.transactions ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRefreshListener(load);

  const filteredBudgets = useMemo(
    () => budgets.filter((b) => b.month.startsWith(activeMonthStr)),
    [budgets, activeMonthStr]
  );

  const excludedCats = useMemo(() => excludedCategoryIds(categories), [categories]);

  // Uncategorised spend rolls into the "Miscellaneous" category bucket.
  const miscCategoryId = useMemo(
    () => categories.find((c) => c.name.toLowerCase() === "miscellaneous")?.id ?? null,
    [categories]
  );

  const spendMap = useMemo(() => {
    return transactions.reduce<Record<string, number>>((acc, t) => {
      if (!t.occurred_at.startsWith(activeMonthStr)) return acc;
      if (!isSpend(t, excludedCats)) return acc;
      const key = t.category_id || miscCategoryId;
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + Number(t.amount || 0);
      return acc;
    }, {});
  }, [transactions, activeMonthStr, excludedCats, miscCategoryId]);

  const totalBudget = useMemo(() => filteredBudgets.reduce((s, b) => s + Number(b.amount || 0), 0), [filteredBudgets]);
  const totalSpent  = useMemo(() => filteredBudgets.reduce((s, b) => s + (b.category_id ? spendMap[b.category_id] || 0 : 0), 0), [filteredBudgets, spendMap]);

  const refreshBudgets = async () => {
    const res = await fetch("/api/budgets");
    const data = await res.json();
    setBudgets(data.budgets ?? []);
  };

  // Distinct months (other than the active one) that already have budgets.
  const sourceMonths = useMemo(() => {
    const counts = new Map<string, number>();
    budgets.forEach((b) => {
      const key = b.month.slice(0, 7);
      if (key === activeMonthStr) return;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, count]) => ({ key, count }));
  }, [budgets, activeMonthStr]);

  const openCopy = () => {
    const prev = format(subMonths(activeMonth, 1), "yyyy-MM");
    const def = sourceMonths.find((m) => m.key === prev)?.key || sourceMonths[0]?.key || "";
    setCopyFrom(def);
    setShowCopy(true);
  };

  const handleCopy = async () => {
    if (!copyFrom) return;
    setCopying(true);
    try {
      const res = await fetch("/api/budgets/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from_month: copyFrom, to_month: activeMonthStr }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to copy.");
      await refreshBudgets();
      setShowCopy(false);
      if (data.copied === 0) {
        toast.info(data.skipped ? "Those budgets already exist this month" : "Nothing to copy");
      } else {
        toast.success(`Copied ${data.copied} budget${data.copied !== 1 ? "s" : ""}${data.skipped ? ` · ${data.skipped} skipped` : ""}`);
      }
      emitRefresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to copy.");
    } finally {
      setCopying(false);
    }
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ category_id: "", amount: "" });
    setError("");
    setShowForm(true);
  };

  const openEdit = (id: string) => {
    const b = budgets.find((x) => x.id === id);
    if (!b) return;
    setEditingId(id);
    setForm({ category_id: b.category_id ?? "", amount: b.amount });
    setError("");
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) return;
    const res = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.error) { setError(data.error || "Failed to delete."); toast.error(data.error || "Failed to delete."); return; }
    await refreshBudgets();
    toast.success("Budget deleted");
    emitRefresh();
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const num = Number(form.amount);
    if (!num || num <= 0) { setError("Amount must be greater than zero."); return; }
    setSaving(true);
    try {
      const cat = form.category_id ? categoryMap[form.category_id] : null;
      const payload = {
        name: cat?.name || "General",
        category_id: form.category_id || null,
        amount: num,
        month: `${activeMonthStr}-01`,
      };
      const res = await fetch(
        editingId ? `/api/budgets/${editingId}` : "/api/budgets",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save.");
      await refreshBudgets();
      setShowForm(false);
      toast.success(editingId ? "Budget updated" : "Budget added");
      emitRefresh();
      setEditingId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const monthLabel = format(activeMonth, "MMMM yyyy");

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Budgets</h1>
          <p className="fb-page-sub">{monthLabel} · {filteredBudgets.length} categories</p>
        </div>
        <div className="flex items-center gap-2">
          {sourceMonths.length > 0 && (
            <button
              onClick={openCopy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--surface-border)] px-3 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
            >
              <CalendarPlus size={16} />
              <span className="hidden sm:inline">Copy from…</span>
              <span className="sm:hidden">Copy</span>
            </button>
          )}
          <button onClick={openAdd} className="fb-add-btn">
            <Plus size={16} />
            Add budget
          </button>
        </div>
      </div>

      {/* Summary strip */}
      {filteredBudgets.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total budget</p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{formatINR(totalBudget)}</p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Total spent</p>
            <p className="mt-1 font-mono text-xl font-bold text-[var(--text-primary)]">{formatINR(totalSpent)}</p>
          </div>
          <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Remaining</p>
            <p
              className="mt-1 font-mono text-xl font-bold"
              style={{ color: totalSpent > totalBudget ? "var(--danger)" : "var(--brand)" }}
            >
              {formatINR(Math.abs(totalBudget - totalSpent))}
              {totalSpent > totalBudget && " over"}
            </p>
          </div>
        </div>
      )}

      {/* Budget grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand)]" />
        </div>
      ) : filteredBudgets.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--surface-border)] py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-raised)] text-2xl">🎯</div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">No budgets for {monthLabel}</p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">Set spending limits to stay on track.</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {sourceMonths.length > 0 && (
              <button
                onClick={openCopy}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--surface-border)] px-3 py-2 text-xs font-medium text-[var(--text-secondary)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
              >
                <CalendarPlus size={14} />
                Copy from last month
              </button>
            )}
            <button onClick={openAdd} className="fb-add-btn text-xs">
              <Plus size={14} />
              Add your first budget
            </button>
          </div>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBudgets.map((b) => {
            const cat = b.category_id ? categoryMap[b.category_id] : null;
            const spent = b.category_id ? spendMap[b.category_id] || 0 : 0;
            return (
              <BudgetCard
                key={b.id}
                id={b.id}
                name={b.name}
                category={cat?.name ?? undefined}
                categoryColor={cat?.color ?? undefined}
                amount={Number(b.amount)}
                spent={spent}
                onEdit={openEdit}
                onDelete={handleDelete}
              />
            );
          })}
          {/* Add card */}
          <button
            onClick={openAdd}
            className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--surface-border)] py-8 text-sm text-[var(--text-muted)] transition hover:border-[var(--brand)] hover:text-[var(--brand)]"
          >
            <Plus size={20} />
            Add category
          </button>
        </div>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForm(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">
                {editingId ? "Edit budget" : "Add budget"}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="fb-select pr-8"
                  >
                    <option value="">General budget</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryIcon(c.name)} {c.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    size={13}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Budget amount
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5">
                  <span className="font-mono text-sm text-[var(--text-muted)]">₹</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    required
                    value={form.amount}
                    onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder="5000"
                    className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    autoFocus
                  />
                </div>
              </div>

              <div className="rounded-xl bg-[var(--surface-raised)] px-4 py-3">
                <p className="text-[11px] text-[var(--text-muted)]">
                  Month: <span className="font-semibold text-[var(--text-primary)]">{monthLabel}</span>
                </p>
              </div>

              {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:opacity-60"
                >
                  {saving ? "Saving…" : editingId ? "Update" : "Save budget"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Copy-from-month modal */}
      {showCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCopy(false)} />
          <div className="relative w-full max-w-sm rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Copy budgets to {monthLabel}</h2>
              <button onClick={() => setShowCopy(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Copy from
                </label>
                <div className="relative">
                  <select
                    value={copyFrom}
                    onChange={(e) => setCopyFrom(e.target.value)}
                    className="fb-select pr-8"
                  >
                    {sourceMonths.map((m) => (
                      <option key={m.key} value={m.key}>
                        {format(new Date(`${m.key}-01T00:00:00`), "MMMM yyyy")} · {m.count} budget{m.count !== 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                </div>
              </div>

              <p className="rounded-xl bg-[var(--surface-raised)] px-4 py-3 text-[11px] text-[var(--text-muted)]">
                Categories already budgeted in {monthLabel} are skipped, so nothing gets duplicated.
              </p>

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCopy(false)}
                  className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={copying || !copyFrom}
                  className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:opacity-60"
                >
                  {copying ? "Copying…" : "Copy budgets"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
