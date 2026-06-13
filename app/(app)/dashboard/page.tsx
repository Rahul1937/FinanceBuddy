"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import SummaryCard from "@/components/dashboard/SummaryCard";
import DonutChart from "@/components/dashboard/DonutChart";
import TransactionList from "@/components/dashboard/TransactionList";

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
  const currentMonthLabel = format(new Date(), "MMMM yyyy");

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

  const totalBudget = useMemo(
    () => currentBudgets.reduce((sum, budget) => sum + Number(budget.amount || 0), 0),
    [currentBudgets]
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

  const chartData = useMemo(
    () => categories.map((category) => ({
      id: category.id,
      label: category.name,
      value: Math.round(budgetSpendMap[category.id] || 0),
      color: category.color || "#38bdf8",
    })),
    [categories, budgetSpendMap]
  );

  return (
    <section className="space-y-8 p-6">
      <header className="fb-page-header">
        <div>
          <h1 className="fb-page-title">Dashboard</h1>
          <p className="fb-page-sub">{currentMonthLabel} · Overview of your spending, budgets, and recent activity.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/transactions/new" className="fb-add-btn">
            + Add expense
          </Link>
          <Link href="/budgets" className="fb-add-btn">
            Manage budgets
          </Link>
        </div>
      </header>

      <div className="fb-summary-grid">
        <SummaryCard
          label="Total spent"
          value={formatCurrency(totalSpent)}
          sub={`of ₹${totalBudget.toLocaleString()} budget`}
          trend={{ dir: "up", text: "+8% vs May" }}
        />
        <SummaryCard
          label="Income"
          value={formatCurrency(totalIncome)}
          sub={`Total income in ${format(new Date(currentMonth + "-01"), "MMMM")}`}
          trend={{ dir: "down", text: "same as last month" }}
        />
        <SummaryCard
          label="Budget health"
          value={`${totalBudget ? Math.min(100, Math.round((totalSpent / totalBudget) * 100)) : 0}%`}
          sub={`${currentBudgets.length} budgets`}
        />
      </div>

      <div className="fb-mid-row">
        <div className="fb-card">
          <div className="fb-card-title">Spending by category <span className="fb-card-badge">{currentMonthLabel}</span></div>
          <DonutChart slices={chartData} />
        </div>

        <div className="fb-card">
          <div className="fb-card-title">Recent transactions <span className="fb-card-badge">{monthlyTransactions.length} this month</span></div>
          <TransactionList
            items={monthlyTransactions.slice(0, 6).map((t) => ({
              id: t.id,
              merchant: t.merchant,
              notes: t.notes,
              amount: t.amount,
              type: t.type,
              occurred_at: t.occurred_at,
            }))}
          />
        </div>
      </div>
    </section>
  );
}
