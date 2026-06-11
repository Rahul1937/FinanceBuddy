"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
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

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [txRes, categoryRes] = await Promise.all([fetch("/api/transactions"), fetch("/api/categories")]);
      const txPayload = await txRes.json();
      const categoryPayload = await categoryRes.json();
      setTransactions(txPayload.transactions ?? []);
      setCategories(categoryPayload.categories ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!editingId) {
      setFormState((state) => ({ ...state, amount: "", merchant: "", notes: "", category_id: "", type: "expense" }));
      return;
    }

    const transaction = transactions.find((item) => item.id === editingId);
    if (transaction) {
      setFormState({
        amount: transaction.amount,
        type: transaction.type,
        category_id: transaction.category_id || "",
        merchant: transaction.merchant || "",
        notes: transaction.notes || "",
        occurred_at: transaction.occurred_at.slice(0, 10),
        currency: transaction.currency || "INR",
      });
    }
  }, [editingId, transactions]);

  const filteredTransactions = useMemo(() => {
    return filterCategory === "all"
      ? transactions
      : transactions.filter((transaction) => transaction.category_id === filterCategory);
  }, [filterCategory, transactions]);

  const handleChange = (field: string, value: string) => {
    setFormState((state) => ({ ...state, [field]: value }));
  };

  const refreshTransactions = async () => {
    const response = await fetch("/api/transactions");
    const payload = await response.json();
    setTransactions(payload.transactions ?? []);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    const payload = {
      amount: Number(formState.amount),
      type: formState.type,
      category_id: formState.category_id || null,
      merchant: formState.merchant || null,
      notes: formState.notes || null,
      occurred_at: `${formState.occurred_at}T00:00:00.000Z`,
      currency: formState.currency,
    };

    try {
      if (editingId) {
        const response = await fetch(`/api/transactions/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Unable to update transaction.");
        }
        setTransactions((current) => current.map((item) => (item.id === editingId ? data.transaction : item)));
        setEditingId(null);
      } else {
        const response = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok || data.error) {
          throw new Error(data.error || "Unable to save transaction.");
        }
        setTransactions((current) => [data.transaction, ...current]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save transaction.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this transaction?")) {
      return;
    }
    const response = await fetch(`/api/transactions/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || data.error) {
      setError(data.error || "Unable to delete transaction.");
      return;
    }
    setTransactions((current) => current.filter((item) => item.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  return (
    <section className="space-y-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Transactions</h1>
          <p className="mt-2 text-sm text-slate-400">View and manage your transaction history.</p>
        </div>
        <Link href="/transactions/new">
          <Button>Add new transaction</Button>
        </Link>
      </header>

      <Card className="space-y-6 bg-slate-950 text-slate-100">
        <div className="grid gap-4 md:grid-cols-[1fr_180px]">
          <div>
            <label className="block text-sm font-medium text-slate-300">Filter by category</label>
            <select
              value={filterCategory}
              onChange={(event) => setFilterCategory(event.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none"
            >
              <option value="all">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-3">
            <Button type="button" className="w-full" onClick={() => setFilterCategory("all")}>
              Reset filter
            </Button>
          </div>
        </div>

        <form onSubmit={handleSave} className="grid gap-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-300">
              Amount
              <Input
                value={formState.amount}
                onChange={(event) => handleChange("amount", event.target.value)}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="mt-2 bg-slate-950 text-slate-100"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Date
              <Input
                type="date"
                value={formState.occurred_at}
                onChange={(event) => handleChange("occurred_at", event.target.value)}
                className="mt-2 bg-slate-950 text-slate-100"
                required
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-300">
              Type
              <select
                value={formState.type}
                onChange={(event) => handleChange("type", event.target.value)}
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
                onChange={(event) => handleChange("category_id", event.target.value)}
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
                onChange={(event) => handleChange("currency", event.target.value)}
                className="mt-2 bg-slate-950 text-slate-100"
              />
            </label>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-medium text-slate-300">
              Merchant
              <Input
                value={formState.merchant}
                onChange={(event) => handleChange("merchant", event.target.value)}
                className="mt-2 bg-slate-950 text-slate-100"
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Notes
              <Input
                value={formState.notes}
                onChange={(event) => handleChange("notes", event.target.value)}
                className="mt-2 bg-slate-950 text-slate-100"
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm text-slate-400">{editingId ? "Edit transaction details." : "Create a new transaction."}</div>
            <div className="flex flex-wrap gap-3">
              {editingId && (
                <Button type="button" className="bg-slate-700" onClick={() => setEditingId(null)}>
                  Cancel edit
                </Button>
              )}
              <Button type="submit">{editingId ? "Update transaction" : "Save transaction"}</Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </Card>

      <Card className="overflow-x-auto bg-slate-950 text-slate-100">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-slate-400">Date</th>
              <th className="px-4 py-3 text-slate-400">Merchant</th>
              <th className="px-4 py-3 text-slate-400">Category</th>
              <th className="px-4 py-3 text-slate-400">Amount</th>
              <th className="px-4 py-3 text-slate-400">Type</th>
              <th className="px-4 py-3 text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-400">
                  Loading transactions...
                </td>
              </tr>
            ) : filteredTransactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-slate-400">
                  No transactions found.
                </td>
              </tr>
            ) : (
              filteredTransactions.map((transaction) => {
                const category = categories.find((item) => item.id === transaction.category_id);
                return (
                  <tr key={transaction.id} className="border-b border-slate-800 last:border-none">
                    <td className="px-4 py-4">{formatDate(transaction.occurred_at)}</td>
                    <td className="px-4 py-4">{transaction.merchant || "—"}</td>
                    <td className="px-4 py-4">{category?.name || "Uncategorized"}</td>
                    <td className="px-4 py-4">{Number(transaction.amount).toFixed(2)}</td>
                    <td className="px-4 py-4">{transaction.type}</td>
                    <td className="px-4 py-4 flex flex-wrap gap-2">
                      <Button type="button" className="bg-slate-700" onClick={() => setEditingId(transaction.id)}>
                        Edit
                      </Button>
                      <Button type="button" className="bg-rose-600" onClick={() => handleDelete(transaction.id)}>
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
    </section>
  );
}
