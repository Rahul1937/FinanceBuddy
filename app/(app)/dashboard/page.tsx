"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";

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
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function DashboardPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const [txRes, budgetRes, categoryRes] = await Promise.all([
        fetch("/api/transactions"),
        fetch("/api/budgets"),
        fetch("/api/categories"),
      ]);

      const txPayload = await txRes.json();
      const budgetPayload = await budgetRes.json();
      const categoryPayload = await categoryRes.json();

      setTransactions(txPayload.transactions ?? []);
      setBudgets(budgetPayload.budgets ?? []);
      setCategories(categoryPayload.categories ?? []);
      setLoading(false);
    };

    loadData();
  }, []);

  const monthlyTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.occurred_at?.startsWith(currentMonth)),
    [transactions, currentMonth]
  );

  const totalSpent = useMemo(
    () =>
      monthlyTransactions.reduce((sum, transaction) => {
        const amount = Number(transaction.amount) || 0;
        return transaction.type === "expense" ? sum + amount : sum;
      }, 0),
    [monthlyTransactions]
  );

  const totalIncome = useMemo(
    () =>
      monthlyTransactions.reduce((sum, transaction) => {
        const amount = Number(transaction.amount) || 0;
        return transaction.type === "income" ? sum + amount : sum;
      }, 0),
    [monthlyTransactions]
  );

  const currentBudgets = useMemo(
    () => budgets.filter((budget) => budget.month.startsWith(currentMonth)),
    [budgets, currentMonth]
  );

  const budgetSpendMap = useMemo(() => {
    return monthlyTransactions.reduce<Record<string, number>>((totals, transaction) => {
      if (transaction.type !== "expense" || !transaction.category_id) {
        return totals;
      }
      totals[transaction.category_id] = (totals[transaction.category_id] || 0) + Number(transaction.amount || 0);
      return totals;
    }, {});
  }, [monthlyTransactions]);

  return (
    <section className="space-y-8 p-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">Overview of your spending, budgets, and recent activity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/transactions/new">
            <Button>Add transaction</Button>
          </Link>
          <Link href="/budgets">
            <Button className="bg-slate-800">Manage budgets</Button>
          </Link>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-3 bg-slate-950 text-slate-100">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">This month</p>
          <p className="text-3xl font-semibold">{formatCurrency(totalSpent)}</p>
          <p className="text-sm text-slate-400">Total expenses in {currentMonth}</p>
        </Card>
        <Card className="space-y-3 bg-slate-950 text-slate-100">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Income</p>
          <p className="text-3xl font-semibold">{formatCurrency(totalIncome)}</p>
          <p className="text-sm text-slate-400">Total income in {currentMonth}</p>
        </Card>
        <Card className="space-y-3 bg-slate-950 text-slate-100">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Budgets</p>
          <p className="text-3xl font-semibold">{currentBudgets.length}</p>
          <p className="text-sm text-slate-400">Budgets defined for this month</p>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card className="bg-slate-950 text-slate-100">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Budget progress</h2>
              <p className="mt-1 text-sm text-slate-400">Track spending against each category target.</p>
            </div>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading budgets...</p>
          ) : currentBudgets.length === 0 ? (
            <p className="text-sm text-slate-400">No budgets defined yet. Add a budget to see progress.</p>
          ) : (
            <div className="space-y-4">
              {currentBudgets.map((budget) => {
                const spent = budget.category_id ? budgetSpendMap[budget.category_id] || 0 : 0;
                const amount = Number(budget.amount || 0);
                const progress = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
                const category = categories.find((item) => item.id === budget.category_id);
                return (
                  <div key={budget.id} className="space-y-2 rounded-3xl bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-100">{budget.name || category?.name || "General"}</p>
                        <p className="text-sm text-slate-400">{category?.name || "Uncategorized"}</p>
                      </div>
                      <p className="text-sm text-slate-300">{formatCurrency(spent)} / {formatCurrency(amount)}</p>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-sky-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="bg-slate-950 text-slate-100">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Recent transactions</h2>
            <p className="mt-1 text-sm text-slate-400">Latest activity from your account.</p>
          </div>
          {loading ? (
            <p className="text-sm text-slate-400">Loading transactions...</p>
          ) : monthlyTransactions.length === 0 ? (
            <p className="text-sm text-slate-400">No transactions recorded for this month yet.</p>
          ) : (
            <div className="space-y-3">
              {monthlyTransactions.slice(0, 5).map((transaction) => {
                const category = categories.find((item) => item.id === transaction.category_id);
                return (
                  <div key={transaction.id} className="rounded-3xl border border-slate-800 bg-slate-900 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="font-semibold text-slate-100">{transaction.merchant || transaction.notes || "Unnamed transaction"}</p>
                        <p className="text-sm text-slate-400">{category?.name || "Uncategorized"}</p>
                      </div>
                      <p className="text-sm text-slate-100">{formatCurrency(Number(transaction.amount || 0))}</p>
                    </div>
                    <p className="mt-2 text-sm text-slate-400">{new Date(transaction.occurred_at).toLocaleDateString()}</p>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}
