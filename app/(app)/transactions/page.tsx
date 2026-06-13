"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus, Search, Pencil, Trash2, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getCategoryIcon } from "@/lib/utils/categories";
import { useRefreshListener, emitRefresh } from "@/lib/hooks/useRefreshBus";

type Transaction = {
  id: string;
  amount: string;
  currency: string;
  type: string;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  occurred_at: string;
};

type Category = {
  id: string;
  name: string;
  color: string | null;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

function groupByDate(transactions: Transaction[]) {
  const groups: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    const day = tx.occurred_at.slice(0, 10);
    if (!groups[day]) groups[day] = [];
    groups[day].push(tx);
  }
  return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // Edit modal state
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [editForm, setEditForm] = useState({
    amount: "", type: "expense", category_id: "", merchant: "", notes: "", occurred_at: "",
  });
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const categoryMap = useMemo(
    () => Object.fromEntries(categories.map((c) => [c.id, c])),
    [categories]
  );

  const load = async () => {
    setLoading(true);
    const [txRes, catRes] = await Promise.all([
      fetch("/api/transactions"),
      fetch("/api/categories"),
    ]);
    const [txPayload, catPayload] = await Promise.all([txRes.json(), catRes.json()]);
    setTransactions(txPayload.transactions ?? []);
    setCategories(catPayload.categories ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  useRefreshListener(load);

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      const matchSearch =
        !search ||
        (t.merchant ?? "").toLowerCase().includes(search.toLowerCase()) ||
        (t.notes ?? "").toLowerCase().includes(search.toLowerCase());
      const matchCat = filterCategory === "all" || t.category_id === filterCategory;
      const matchType = filterType === "all" || t.type === filterType;
      return matchSearch && matchCat && matchType;
    });
  }, [transactions, search, filterCategory, filterType]);

  const grouped = useMemo(() => groupByDate(filtered), [filtered]);

  const openEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setEditError("");
    setEditForm({
      amount: tx.amount,
      type: tx.type,
      category_id: tx.category_id ?? "",
      merchant: tx.merchant ?? "",
      notes: tx.notes ?? "",
      occurred_at: tx.occurred_at.slice(0, 10),
    });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx) return;
    setEditError("");
    setEditSaving(true);
    try {
      const res = await fetch(`/api/transactions/${editingTx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(editForm.amount),
          type: editForm.type,
          category_id: editForm.category_id || null,
          merchant: editForm.merchant || null,
          notes: editForm.notes || null,
          occurred_at: `${editForm.occurred_at}T00:00:00.000Z`,
          currency: "INR",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to update.");
      setTransactions((prev) => prev.map((t) => (t.id === editingTx.id ? data.transaction : t)));
      setEditingTx(null);
      toast.success("Transaction updated");
      emitRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to update.";
      setEditError(message);
      toast.error(message);
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) return;
    const res = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok || data.error) { toast.error(data.error || "Failed to delete."); return; }
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    if (editingTx?.id === id) setEditingTx(null);
    toast.success("Transaction deleted");
    emitRefresh();
  };

  return (
    <div className="space-y-5 p-5 lg:p-6">
      {/* Header */}
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Transactions</h1>
          <p className="fb-page-sub">{filtered.length} of {transactions.length} entries</p>
        </div>
        <Link href="/transactions/new" className="fb-add-btn">
          <Plus size={16} />
          Add
        </Link>
      </div>

      {/* Search + filters */}
      <div className="fb-card space-y-3">
        {/* Search bar */}
        <div className="flex items-center gap-2.5 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5">
          <Search size={14} className="shrink-0 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Search transactions…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {/* Type filters */}
          {(["all", "expense", "income"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                filterType === t
                  ? "bg-[var(--brand)] text-white"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
            >
              {t === "all" ? "All types" : t}
            </button>
          ))}
          <span className="mx-1 border-r border-[var(--surface-border)]" />
          {/* Category filters */}
          <button
            onClick={() => setFilterCategory("all")}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
              filterCategory === "all"
                ? "bg-[var(--surface-border)] text-[var(--text-primary)]"
                : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            All categories
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition ${
                filterCategory === cat.id
                  ? "text-white"
                  : "bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              }`}
              style={filterCategory === cat.id ? { background: cat.color || "var(--brand)" } : {}}
            >
              {getCategoryIcon(cat.name)} {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction list */}
      <div className="fb-card">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand)]" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm font-medium text-[var(--text-muted)]">No transactions found</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Try adjusting your filters or add a new transaction.</p>
          </div>
        ) : (
          <div className="space-y-1">
            {grouped.map(([day, txs]) => {
              let dateLabel = "";
              try {
                const d = parseISO(day);
                const today = new Date().toISOString().slice(0, 10);
                const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
                dateLabel = day === today ? "Today" : day === yesterday ? "Yesterday" : format(d, "d MMMM yyyy");
              } catch {
                dateLabel = day;
              }

              return (
                <div key={day}>
                  <div className="fb-tx-date-label">{dateLabel}</div>
                  {txs.map((tx) => {
                    const cat = tx.category_id ? categoryMap[tx.category_id] : null;
                    const isIncome = tx.type === "income";
                    const icon = cat ? getCategoryIcon(cat.name) : (isIncome ? "💰" : "📌");
                    const iconBg = cat?.color
                      ? `${cat.color}22`
                      : isIncome ? "var(--positive-soft)" : "var(--surface-raised)";

                    return (
                      <div
                        key={tx.id}
                        className="group fb-tx-row relative"
                      >
                        <div className="fb-tx-icon" style={{ background: iconBg }}>
                          {icon}
                        </div>
                        <div className="fb-tx-info">
                          <div className="fb-tx-name">{tx.merchant || tx.notes || "Unnamed"}</div>
                          <div className="fb-tx-meta">
                            {cat?.name ?? "Uncategorized"} · {tx.type}
                          </div>
                        </div>
                        <div className={`fb-tx-amount ${isIncome ? "income" : "expense"}`}>
                          {isIncome ? "+" : "−"}₹{Number(tx.amount).toLocaleString("en-IN")}
                        </div>
                        {/* Hover actions */}
                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition group-hover:opacity-100">
                          <button
                            onClick={() => openEdit(tx)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-border)] hover:text-[var(--text-primary)]"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => handleDelete(tx.id)}
                            className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[rgba(244,63,94,0.12)] hover:text-[var(--danger)]"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editingTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingTx(null)} />
          <div className="relative w-full max-w-md rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Edit transaction</h2>
              <button onClick={() => setEditingTx(null)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4">
              {/* Type toggle */}
              <div className="flex rounded-xl bg-[var(--surface-raised)] p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                      editForm.type === t
                        ? t === "expense"
                          ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "bg-[var(--positive-soft)] text-[var(--positive)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Amount</label>
                  <div className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5">
                    <span className="font-mono text-sm text-[var(--text-muted)]">₹</span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editForm.amount}
                      onChange={(e) => setEditForm((f) => ({ ...f, amount: e.target.value }))}
                      className="w-full bg-transparent font-mono text-sm text-[var(--text-primary)] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.occurred_at}
                    onChange={(e) => setEditForm((f) => ({ ...f, occurred_at: e.target.value }))}
                    className="fb-input"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Merchant / Description</label>
                <input
                  type="text"
                  value={editForm.merchant}
                  onChange={(e) => setEditForm((f) => ({ ...f, merchant: e.target.value }))}
                  placeholder="e.g. Swiggy, Amazon…"
                  className="fb-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Category</label>
                  <select
                    value={editForm.category_id}
                    onChange={(e) => setEditForm((f) => ({ ...f, category_id: e.target.value }))}
                    className="fb-select"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Notes</label>
                  <input
                    type="text"
                    value={editForm.notes}
                    onChange={(e) => setEditForm((f) => ({ ...f, notes: e.target.value }))}
                    className="fb-input"
                  />
                </div>
              </div>

              {editError && <p className="text-xs text-[var(--danger)]">{editError}</p>}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setEditingTx(null)}
                  className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="flex-1 rounded-xl bg-[var(--brand)] py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:opacity-60"
                >
                  {editSaving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
