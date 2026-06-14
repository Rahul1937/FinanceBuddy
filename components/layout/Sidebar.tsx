"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  ArrowLeftRight,
  PlusCircle,
  Target,
  Sparkles,
  Settings2,
  FileUp,
  CalendarClock,
  BarChart3,
  PiggyBank,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { excludedCategoryIds, isSpend } from "@/lib/utils/spend";
import { dueWithin } from "@/lib/utils/recurring";
import { useRefreshListener } from "@/lib/hooks/useRefreshBus";

const navItems = [
  { href: "/dashboard",        label: "Dashboard",    icon: LayoutDashboard },
  { href: "/transactions",     label: "Transactions", icon: ArrowLeftRight  },
  { href: "/transactions/new", label: "Add expense",  icon: PlusCircle      },
  { href: "/budgets",          label: "Budgets",      icon: Target          },
  { href: "/savings",          label: "Savings",      icon: PiggyBank       },
  { href: "/recurring",        label: "Recurring",    icon: CalendarClock   },
  { href: "/import",           label: "Import",       icon: FileUp          },
  { href: "/reports",          label: "Reports",      icon: BarChart3       },
  { href: "/insights",         label: "Insights",     icon: Sparkles        },
];

function formatINR(value: number) {
  if (value >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(1)}k`;
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [budgetTotal, setBudgetTotal] = useState(0);
  const [spentTotal, setSpentTotal] = useState(0);
  const [dueBills, setDueBills] = useState(0);
  const [tick, setTick] = useState(0);

  useRefreshListener(() => setTick((t) => t + 1));

  useEffect(() => {
    const load = async () => {
      try {
        const [budgetRes, txRes, catRes, recRes] = await Promise.all([
          fetch("/api/budgets"),
          fetch("/api/transactions"),
          fetch("/api/categories"),
          fetch("/api/recurring"),
        ]);
        const budgetsPayload = await budgetRes.json();
        const txPayload = await txRes.json();
        const catPayload = await catRes.json();
        const recPayload = await recRes.json();
        const currentMonth = new Date().toISOString().slice(0, 7);
        const excluded = excludedCategoryIds(catPayload.categories ?? []);

        setDueBills((recPayload.rules ?? []).filter((r: any) => dueWithin(r, 7)).length);

        const monthBudgets = (budgetsPayload.budgets ?? []).filter((b: any) =>
          b.month.startsWith(currentMonth)
        );
        const monthExpenses = (txPayload.transactions ?? []).filter(
          (t: any) => t.occurred_at.startsWith(currentMonth) && isSpend(t, excluded)
        );

        setBudgetTotal(monthBudgets.reduce((s: number, b: any) => s + Number(b.amount || 0), 0));
        setSpentTotal(monthExpenses.reduce((s: number, t: any) => s + Number(t.amount || 0), 0));
      } catch {}
    };
    load();

    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [pathname, tick]);

  const healthPercent = useMemo(() => {
    if (!budgetTotal) return 0;
    return Math.max(4, Math.min(100, Math.round((spentTotal / budgetTotal) * 100)));
  }, [budgetTotal, spentTotal]);

  const barColor =
    healthPercent > 100 ? "var(--danger)" :
    healthPercent > 80  ? "var(--warning)" :
    "var(--positive)";

  const name     = user?.email?.split("@")[0] ?? "Account";
  const initials = name.charAt(0).toUpperCase();

  return (
    <aside className="hidden lg:flex w-[240px] shrink-0 flex-col border-r border-[var(--surface-border)] bg-[var(--surface-card)] overflow-y-auto">
      {/* Logo */}
      <div className="flex items-center gap-2.5 border-b border-[var(--surface-border)] px-5 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
          <span className="text-base font-bold text-[var(--brand)]">₹</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-[var(--text-primary)]">Finance Buddy</p>
          <p className="text-[10px] text-[var(--text-muted)]">Track smarter</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <p className="mb-2 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Main
        </p>
        <div className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-[var(--brand-soft)] text-[var(--brand)]"
                    : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.href === "/recurring" && dueBills > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--warning)] px-1.5 text-[10px] font-bold text-white">
                    {dueBills}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        <p className="mb-2 mt-5 px-2 text-[9px] font-semibold uppercase tracking-[0.15em] text-[var(--text-muted)]">
          Account
        </p>
        <Link
          href="/settings"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
            pathname === "/settings"
              ? "bg-[var(--brand-soft)] text-[var(--brand)]"
              : "text-[var(--text-muted)] hover:bg-[var(--surface-raised)] hover:text-[var(--text-secondary)]"
          }`}
        >
          <Settings2 className="h-4 w-4 shrink-0" />
          <span>Settings</span>
        </Link>
      </nav>

      {/* Budget mini widget */}
      <div className="border-t border-[var(--surface-border)] px-4 py-4 space-y-3">
        <div className="rounded-xl bg-[var(--surface-card)] border border-[var(--surface-border)] p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Monthly budget
            </p>
            <span
              className="text-[10px] font-bold"
              style={{
                color: healthPercent > 100 ? "var(--danger)" : healthPercent > 80 ? "var(--warning)" : "var(--positive)",
              }}
            >
              {healthPercent}%
            </span>
          </div>
          <div className="fb-progress-bg">
            <div
              className="fb-progress-fill"
              style={{ width: `${Math.min(healthPercent, 100)}%`, background: barColor }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px]">
            <span className="font-semibold text-[var(--text-primary)]">{formatINR(spentTotal)}</span>
            <span className="text-[var(--text-muted)]">of {formatINR(budgetTotal)}</span>
          </div>
        </div>

        {/* User badge */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-[var(--text-primary)]">{name}</p>
            <p className="truncate text-[10px] text-[var(--text-muted)]">{user?.email ?? ""}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
