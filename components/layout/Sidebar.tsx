"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Home, List, PlusCircle, Target, Sparkles, Settings } from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/transactions", label: "Transactions", icon: List },
  { href: "/transactions/new", label: "Add expense", icon: PlusCircle },
  { href: "/budgets", label: "Budgets", icon: Target },
  { href: "/insights", label: "Insights", icon: Sparkles },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [spentTotal, setSpentTotal] = useState(0);

  useEffect(() => {
    const loadSummary = async () => {
      const [budgetRes, txRes] = await Promise.all([fetch("/api/budgets"), fetch("/api/transactions")]);
      const budgetsPayload = await budgetRes.json();
      const txPayload = await txRes.json();
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthBudgets = (budgetsPayload.budgets ?? []).filter((budget: any) => budget.month.startsWith(currentMonth));
      const monthTransactions = (txPayload.transactions ?? []).filter((transaction: any) => transaction.occurred_at.startsWith(currentMonth) && transaction.type === "expense");

      setBudgetTotal(monthBudgets.reduce((sum: number, budget: any) => sum + Number(budget.amount || 0), 0));
      setSpentTotal(monthTransactions.reduce((sum: number, transaction: any) => sum + Number(transaction.amount || 0), 0));
    };

    loadSummary();
  }, []);

  const healthPercent = useMemo(() => {
    if (!budgetTotal) return 0;
    return Math.max(8, Math.min(100, Math.round((spentTotal / budgetTotal) * 100)));
  }, [budgetTotal, spentTotal]);

  const name = user?.email?.split("@")[0] ?? "Friend";
  const initials = name.charAt(0).toUpperCase();

  return (
    <aside className="flex min-h-[calc(100vh-88px)] flex-col rounded-[2rem] border border-[var(--surface-border)] bg-[#0E1525] p-5 text-[var(--text-primary)] shadow-card">
      <div className="mb-8 border-b border-[var(--surface-border)] pb-5">
        <div className="inline-flex items-center gap-3 rounded-[1.75rem] bg-[rgba(16,185,129,0.12)] px-3 py-2 text-sm font-semibold text-[var(--brand)]">
          <span>₹</span>
          <span>Finance Buddy</span>
        </div>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Track smarter with compact insights.</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition ${
                isActive
                  ? "bg-[rgba(16,185,129,0.10)] text-[var(--brand)]"
                  : "text-[var(--text-muted)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
              }`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-4">
        <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
          <div className="mb-3 flex items-center justify-between gap-2 text-xs uppercase tracking-[0.24em] text-[var(--text-muted)]">
            <span>Monthly budget</span>
            <span>{healthPercent}%</span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-[var(--surface-border)]">
            <div className="h-full rounded-full bg-[var(--brand)]" style={{ width: `${healthPercent}%` }} />
          </div>
          <div className="mt-4 grid gap-2 text-xs text-[var(--text-muted)]">
            <div className="flex items-center justify-between">
              <span>Spent</span>
              <span className="font-semibold text-[var(--text-primary)]">₹{spentTotal.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Budget</span>
              <span className="font-semibold text-[var(--text-muted)]">₹{budgetTotal.toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="rounded-[1.75rem] border border-[var(--surface-border)] bg-[#0B1322] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[rgba(16,185,129,0.14)] text-[var(--brand)] font-semibold">
              {initials}
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{name}</p>
              <p className="text-xs text-[var(--text-muted)]">{user?.email ?? "No email"}</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
