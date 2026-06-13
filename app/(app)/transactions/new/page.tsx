"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";
import { emitRefresh } from "@/lib/hooks/useRefreshBus";

type Category = {
  id: string;
  name: string;
  color: string | null;
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [categoryId, setCategoryId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.categories ?? []));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    const num = Number(amount);
    if (!num || num <= 0) { setError("Amount must be greater than zero."); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: num,
          type,
          category_id: categoryId || null,
          merchant: merchant || null,
          notes: notes || null,
          occurred_at: `${date}T00:00:00.000Z`,
          currency: "INR",
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Unable to save.");
      toast.success(`${type === "income" ? "Income" : "Expense"} of ₹${num.toLocaleString("en-IN")} added`);
      emitRefresh();
      router.push("/transactions");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save transaction.";
      setError(message);
      toast.error(message);
      setSubmitting(false);
    }
  };

  const displayAmount = amount ? `${amount}` : "0";

  return (
    <div className="p-5 lg:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--surface-border)] text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="fb-page-title">Add transaction</h1>
          <p className="fb-page-sub">Record a new expense or income</p>
        </div>
      </div>

      <div className="mx-auto max-w-lg">
        <div className="fb-card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Hero amount display */}
            <div className="border-b border-[var(--surface-border)] pb-5 text-center">
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">Amount</p>
              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-4xl font-medium text-[var(--text-muted)]">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-48 bg-transparent text-center font-mono text-4xl font-medium text-[var(--text-primary)] outline-none placeholder:text-[var(--surface-border)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                  autoFocus
                />
              </div>
              {amount && Number(amount) > 0 && (
                <p className="mt-2 text-sm text-[var(--text-muted)]">
                  ₹{Number(amount).toLocaleString("en-IN")}
                </p>
              )}
            </div>

            {/* Type toggle */}
            <div className="flex rounded-xl bg-[var(--surface-raised)] p-1">
              {(["expense", "income"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize transition ${
                    type === t
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

            {/* Merchant */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Merchant / Description
              </label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="e.g. Swiggy, Amazon, Salary…"
                className="fb-input"
              />
            </div>

            {/* Category + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Category
                </label>
                <div className="relative">
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="fb-select pr-8"
                  >
                    <option value="">Uncategorized</option>
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
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="fb-input"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                Notes <span className="normal-case text-[var(--text-muted)]">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any extra details…"
                className="fb-input"
              />
            </div>

            {error && <p className="rounded-xl bg-[rgba(244,63,94,0.08)] px-4 py-2.5 text-sm text-[var(--danger)]">{error}</p>}

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border border-[var(--surface-border)] py-3 text-sm font-medium text-[var(--text-muted)] transition hover:border-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !amount || Number(amount) <= 0}
                className="flex-1 rounded-xl bg-[var(--brand)] py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-dim)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save transaction"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
