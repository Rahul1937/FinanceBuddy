"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";

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
};

type Transaction = {
  amount: string;
  type: string;
  category_id: string | null;
  occurred_at: string;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedBudgetId, setSelectedBudgetId] = useState<string | null>(null);
  const [budgetForm, setBudgetForm] = useState({
    category_id: "",
    amount: "",
    name: "",
    month: new Date().toISOString().slice(0, 7),
  });
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [categoryRes, budgetRes, txRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/budgets"),
        fetch("/api/transactions"),
      ]);
      const [categoryPayload, budgetPayload, txPayload] = await Promise.all([
        categoryRes.json(),
        budgetRes.json(),
        txRes.json(),
      ]);
      setCategories(categoryPayload.categories ?? []);
      setBudgets(budgetPayload.budgets ?? []);
      setTransactions(txPayload.transactions ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  useEffect(() => {
    if (!selectedBudgetId) {
      setBudgetForm((state) => ({ ...state, name: "", amount: "", category_id: "" }));
      return;
    }

    const budget = budgets.find((item) => item.id === selectedBudgetId);
    if (budget) {
      setBudgetForm({
        category_id: budget.category_id || "",
        amount: budget.amount,
        name: budget.name,
        month: budget.month.slice(0, 7),
      });
    }
  }, [selectedBudgetId, budgets]);

  const filteredBudgets = useMemo(
    () => budgets.filter((budget) => budget.month.startsWith(selectedMonth)),
    [budgets, selectedMonth]
  );

  const spendingForCategory = useMemo(() => {
    return transactions.reduce<Record<string, number>>((result, transaction) => {
      if (transaction.type !== "expense" || !transaction.category_id) return result;
      const transactionMonth = transaction.occurred_at.slice(0, 7);
      if (transactionMonth !== selectedMonth) return result;
      result[transaction.category_id] = (result[transaction.category_id] || 0) + Number(transaction.amount || 0);
      return result;
    }, {});
  }, [transactions, selectedMonth]);

  const refreshBudgets = async () => {
    const response = await fetch("/api/budgets");
    const data = await response.json();
    setBudgets(data.budgets ?? []);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    const payload = {
      name: budgetForm.name || categories.find((cat) => cat.id === budgetForm.category_id)?.name || "General",
      category_id: budgetForm.category_id || null,
      amount: Number(budgetForm.amount),
      month: `${budgetForm.month}-01`,
    };

    try {
      const response = await fetch(
        selectedBudgetId ? `/api/budgets/${selectedBudgetId}` : "/api/budgets",
        {
          method: selectedBudgetId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error || "Unable to save budget.");
      }
      await refreshBudgets();
      setSelectedBudgetId(null);
      setBudgetForm((prev) => ({ ...prev, amount: "", category_id: "", name: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to save budget.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this budget?")) {
      return;
    }
    const response = await fetch(`/api/budgets/${id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok || data.error) {
      setError(data.error || "Unable to delete budget.");
      return;
    }
    await refreshBudgets();
    setSelectedBudgetId((current) => (current === id ? null : current));
  };

  return (
    <section className="space-y-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Budgets</h1>
          <p className="mt-2 text-sm text-slate-400">Define and track monthly budgets by category.</p>
        </div>
      </header>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <h2 className="text-xl font-semibold">Month selection</h2>
            <p className="mt-2 text-sm text-slate-400">Choose which month to view and update budgets for.</p>
            <div className="mt-4 max-w-xs">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(event) => setSelectedMonth(event.target.value)}
                className="bg-slate-900 text-slate-100"
              />
            </div>
          </div>
          <div>
            <h2 className="text-xl font-semibold">Monthly spend</h2>
            <p className="mt-2 text-sm text-slate-400">Spending totals are based on transaction category assignment.</p>
            <div className="mt-4 rounded-3xl border border-slate-800 bg-slate-900 p-4">
              <p className="text-sm text-slate-400">Categories with budgets:</p>
              <p className="mt-2 text-3xl font-semibold text-slate-100">{filteredBudgets.length}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="block text-sm font-medium text-slate-300">
              Category
              <select
                value={budgetForm.category_id}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, category_id: event.target.value }))}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none"
              >
                <option value="">General budget</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Amount
              <Input
                type="number"
                step="0.01"
                value={budgetForm.amount}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, amount: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
                required
              />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Month
              <Input
                type="month"
                value={budgetForm.month}
                onChange={(event) => setBudgetForm((prev) => ({ ...prev, month: event.target.value }))}
                className="mt-2 bg-slate-900 text-slate-100"
                required
              />
            </label>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">{selectedBudgetId ? "Update an existing budget." : "Add a budget amount for a category."}</p>
            <div className="flex flex-wrap gap-3">
              {selectedBudgetId && (
                <Button type="button" className="bg-slate-700" onClick={() => setSelectedBudgetId(null)}>
                  Cancel edit
                </Button>
              )}
              <Button type="submit">{selectedBudgetId ? "Update budget" : "Save budget"}</Button>
            </div>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
        </form>
      </Card>

      <Card className="rounded-3xl border border-slate-800 bg-slate-950 p-6 text-slate-100">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Budgets for {selectedMonth}</h2>
            <p className="mt-2 text-sm text-slate-400">See spending progress for each budgeted category.</p>
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400">Loading budgets...</p>
        ) : filteredBudgets.length === 0 ? (
          <p className="text-sm text-slate-400">No budgets saved for this month.</p>
        ) : (
          <div className="space-y-4">
            {filteredBudgets.map((budget) => {
              const spent = budget.category_id ? spendingForCategory[budget.category_id] || 0 : 0;
              const amount = Number(budget.amount || 0);
              const progress = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
              const category = categories.find((cat) => cat.id === budget.category_id);
              return (
                <div key={budget.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-100">{budget.name || category?.name || "General"}</p>
                      <p className="text-sm text-slate-400">{category?.name || "Uncategorized"}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-100">{formatCurrency(spent)} / {formatCurrency(amount)}</p>
                      <p className="text-sm text-slate-400">{progress.toFixed(0)}% used</p>
                    </div>
                  </div>
                  <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Button type="button" className="bg-slate-700" onClick={() => setSelectedBudgetId(budget.id)}>
                      Edit
                    </Button>
                    <Button type="button" className="bg-rose-600" onClick={() => handleDelete(budget.id)}>
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
