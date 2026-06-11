"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";

type Category = {
  id: string;
  name: string;
};

export default function NewTransactionPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [formState, setFormState] = useState({
    amount: "",
    type: "expense",
    category_id: "",
    merchant: "",
    notes: "",
    occurred_at: new Date().toISOString().slice(0, 10),
    currency: "INR",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadCategories = async () => {
      const response = await fetch("/api/categories");
      const payload = await response.json();
      setCategories(payload.categories ?? []);
    };

    loadCategories();
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: Number(formState.amount),
          type: formState.type,
          category_id: formState.category_id || null,
          merchant: formState.merchant || null,
          notes: formState.notes || null,
          occurred_at: `${formState.occurred_at}T00:00:00.000Z`,
          currency: formState.currency,
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to save transaction.");
      }

      router.push("/transactions");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transaction.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-semibold">New Transaction</h1>
        <p className="mt-2 text-sm text-slate-400">Add a new expense or income item.</p>
      </header>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-300">
              Amount
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={formState.amount}
                onChange={(event) => setFormState((prev) => ({ ...prev, amount: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Date
              <Input
                type="date"
                value={formState.occurred_at}
                onChange={(event) => setFormState((prev) => ({ ...prev, occurred_at: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
                required
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-300">
              Type
              <select
                value={formState.type}
                onChange={(event) => setFormState((prev) => ({ ...prev, type: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="transfer">Transfer</option>
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Category
              <select
                value={formState.category_id}
                onChange={(event) => setFormState((prev) => ({ ...prev, category_id: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="">Uncategorized</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Currency
              <Input
                value={formState.currency}
                onChange={(event) => setFormState((prev) => ({ ...prev, currency: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
              />
            </label>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-300">
              Merchant
              <Input
                value={formState.merchant}
                onChange={(event) => setFormState((prev) => ({ ...prev, merchant: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Notes
              <Input
                value={formState.notes}
                onChange={(event) => setFormState((prev) => ({ ...prev, notes: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">Add transaction details and save to your account.</div>
            <Button type="submit" disabled={submitting}>{submitting ? "Saving..." : "Save transaction"}</Button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </Card>
    </section>
  );
}
