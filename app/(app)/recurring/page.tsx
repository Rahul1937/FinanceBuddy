"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, X, CalendarClock } from "lucide-react";
import RecurringCard from "@/components/recurring/RecurringCard";
import { emitRefresh } from "@/lib/hooks/useRefreshBus";
import { getCategoryIcon } from "@/lib/utils/categories";
import { dueWithin, ruleStatus, type RecurringRule } from "@/lib/utils/recurring";

type Category = { id: string; name: string; color: string | null };

const todayStr = () => new Date().toISOString().slice(0, 10);

const emptyForm = {
  type: "expense" as "expense" | "income",
  amount: "",
  merchant: "",
  category_id: "",
  frequency: "monthly",
  interval: "1",
  next_due: todayStr(),
  end_date: "",
  auto_post: false,
};

export default function RecurringPage() {
  const [rules, setRules] = useState<RecurringRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [postingId, setPostingId] = useState<string | null>(null);

  const categoryMap = useMemo(() => Object.fromEntries(categories.map((c) => [c.id, c])), [categories]);

  const load = async () => {
    setLoading(true);
    // Catch up any auto-post rules first, then load.
    try { await fetch("/api/recurring/run-due", { method: "POST" }); } catch {}
    const [rRes, cRes] = await Promise.all([fetch("/api/recurring"), fetch("/api/categories")]);
    const [r, c] = await Promise.all([rRes.json(), cRes.json()]);
    setRules(r.rules ?? []);
    setCategories(c.categories ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const dueSoon = useMemo(
    () => rules.filter((r) => dueWithin(r, 7)).sort((a, b) => a.next_due.localeCompare(b.next_due)),
    [rules]
  );
  const others = useMemo(
    () => rules.filter((r) => !dueWithin(r, 7)).sort((a, b) => {
      if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
      return a.next_due.localeCompare(b.next_due);
    }),
    [rules]
  );

  const monthlyCommitted = useMemo(() => {
    const perMonth = (r: RecurringRule) => {
      const amt = Number(r.amount) || 0;
      const n = Math.max(1, r.interval || 1);
      switch (r.frequency) {
        case "daily": return (amt / n) * 30;
        case "weekly": return (amt / n) * 4.33;
        case "yearly": return amt / n / 12;
        default: return amt / n; // monthly
      }
    };
    return rules.filter((r) => r.is_active && r.type === "expense").reduce((s, r) => s + perMonth(r), 0);
  }, [rules]);

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setError(""); setShowForm(true); };
  const openEdit = (r: RecurringRule) => {
    setEditingId(r.id);
    setForm({
      type: r.type === "income" ? "income" : "expense",
      amount: String(r.amount),
      merchant: r.merchant ?? "",
      category_id: r.category_id ?? "",
      frequency: r.frequency,
      interval: String(r.interval || 1),
      next_due: r.next_due,
      end_date: r.end_date ?? "",
      auto_post: r.auto_post,
    });
    setError("");
    setShowForm(true);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!amount || amount <= 0) { setError("Amount must be greater than zero."); return; }
    setSaving(true);
    setError("");
    try {
      const body = {
        type: form.type,
        amount,
        merchant: form.merchant.trim() || null,
        category_id: form.category_id || null,
        frequency: form.frequency,
        interval: Number(form.interval) || 1,
        next_due: form.next_due,
        end_date: form.end_date || null,
        auto_post: form.auto_post,
      };
      const res = await fetch(editingId ? `/api/recurring/${editingId}` : "/api/recurring", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to save.");
      toast.success(editingId ? "Schedule updated" : "Schedule added");
      emitRefresh();
      setShowForm(false);
      setEditingId(null);
      load();
    } catch (err) {
      const m = err instanceof Error ? err.message : "Failed to save.";
      setError(m); toast.error(m);
    } finally {
      setSaving(false);
    }
  };

  const handlePost = async (id: string) => {
    setPostingId(id);
    try {
      const res = await fetch(`/api/recurring/${id}/post`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed.");
      toast.success(data.deactivated ? "Posted — schedule ended" : "Transaction added");
      emitRefresh();
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to post.");
    } finally {
      setPostingId(null);
    }
  };

  const handleTogglePause = async (r: RecurringRule) => {
    const res = await fetch(`/api/recurring/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !r.is_active }),
    });
    if (!res.ok) { toast.error("Couldn't update."); return; }
    toast.success(r.is_active ? "Paused" : "Resumed");
    emitRefresh();
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this recurring schedule? Past transactions stay.")) return;
    const res = await fetch(`/api/recurring/${id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Couldn't delete."); return; }
    toast.success("Schedule deleted");
    emitRefresh();
    load();
  };

  const renderCard = (r: RecurringRule) => {
    const cat = r.category_id ? categoryMap[r.category_id] : null;
    return (
      <RecurringCard
        key={r.id}
        rule={r}
        categoryName={cat?.name}
        categoryColor={cat?.color}
        posting={postingId === r.id}
        onPost={handlePost}
        onEdit={openEdit}
        onTogglePause={handleTogglePause}
        onDelete={handleDelete}
      />
    );
  };

  return (
    <div className="space-y-5 p-5 lg:p-6">
      <div className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Recurring & Bills</h1>
          <p className="fb-page-sub">Subscriptions, EMIs, salary and bills — tracked and posted on schedule.</p>
        </div>
        <button onClick={openAdd} className="fb-add-btn"><Plus size={16} /> Add schedule</button>
      </div>

      {/* Summary strip */}
      <div className="fb-summary-grid">
        <div className="fb-summary-card">
          <div className="fb-summary-card-label">Active schedules</div>
          <div className="fb-summary-card-value mono">{rules.filter((r) => r.is_active).length}</div>
        </div>
        <div className="fb-summary-card">
          <div className="fb-summary-card-label">Due in 7 days</div>
          <div className="fb-summary-card-value mono" style={{ color: dueSoon.length ? "var(--warning)" : undefined }}>
            {dueSoon.length}
          </div>
        </div>
        <div className="fb-summary-card">
          <div className="fb-summary-card-label">Est. monthly bills</div>
          <div className="fb-summary-card-value mono">
            ₹{Math.round(monthlyCommitted).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand)]" />
        </div>
      ) : rules.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-raised)] py-16 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-card)]">
            <CalendarClock size={24} className="text-[var(--text-muted)]" />
          </div>
          <p className="font-display text-base font-semibold text-[var(--text-primary)]">No recurring schedules yet</p>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Add your rent, subscriptions, EMIs or salary to track them.</p>
          <button onClick={openAdd} className="fb-add-btn mt-5 text-xs"><Plus size={14} /> Add your first</button>
        </div>
      ) : (
        <>
          {dueSoon.length > 0 && (
            <div>
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                <CalendarClock size={13} /> Due soon
              </p>
              <div className="grid gap-3 lg:grid-cols-2">{dueSoon.map(renderCard)}</div>
            </div>
          )}
          {others.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">All schedules</p>
              <div className="grid gap-3 lg:grid-cols-2">{others.map(renderCard)}</div>
            </div>
          )}
        </>
      )}

      {/* Add / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
                {editingId ? "Edit schedule" : "New schedule"}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"><X size={18} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex rounded-xl bg-[var(--surface-raised)] p-1">
                {(["expense", "income"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, type: t }))}
                    className={`flex-1 rounded-lg py-2 text-sm font-semibold capitalize transition ${
                      form.type === t
                        ? t === "expense"
                          ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                          : "bg-[var(--positive-soft)] text-[var(--positive)]"
                        : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >{t}</button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Amount</label>
                  <input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" required className="fb-input" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Category</label>
                  <select value={form.category_id} onChange={(e) => setForm((f) => ({ ...f, category_id: e.target.value }))} className="fb-select">
                    <option value="">Uncategorized</option>
                    {categories.map((c) => <option key={c.id} value={c.id}>{getCategoryIcon(c.name)} {c.name}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Name / merchant</label>
                <input value={form.merchant} onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))} placeholder="e.g. Netflix, Rent, Salary" className="fb-input" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Repeats</label>
                  <select value={form.frequency} onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))} className="fb-select">
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Every</label>
                  <input type="number" min="1" value={form.interval} onChange={(e) => setForm((f) => ({ ...f, interval: e.target.value }))} className="fb-input" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">Next due</label>
                  <input type="date" value={form.next_due} onChange={(e) => setForm((f) => ({ ...f, next_due: e.target.value }))} required className="fb-input" />
                </div>
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">End date <span className="normal-case">(optional)</span></label>
                  <input type="date" value={form.end_date} onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} className="fb-input" />
                </div>
              </div>

              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">
                  Auto-add on due date
                  <span className="block text-[11px] text-[var(--text-muted)]">Creates the transaction automatically when due</span>
                </span>
                <input type="checkbox" checked={form.auto_post} onChange={(e) => setForm((f) => ({ ...f, auto_post: e.target.checked }))} className="h-4 w-4 accent-[var(--brand)]" />
              </label>

              {error && <p className="text-xs text-[var(--danger)]">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 rounded-xl border border-[var(--surface-border)] py-2.5 text-sm font-medium text-[var(--text-muted)] transition hover:text-[var(--text-primary)]">Cancel</button>
                <button type="submit" disabled={saving} className="fb-add-btn flex-1 justify-center disabled:opacity-60">{saving ? "Saving…" : editingId ? "Update" : "Add schedule"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
