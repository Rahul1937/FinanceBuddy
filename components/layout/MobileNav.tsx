"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard, ArrowLeftRight, PlusCircle, CalendarClock, MoreHorizontal,
  Target, FileUp, Sparkles, Settings2, BarChart3, X,
} from "lucide-react";
import { useQuickAdd } from "@/lib/context/QuickAddContext";

const tabs = [
  { href: "/dashboard",        label: "Home",         icon: LayoutDashboard },
  { href: "/transactions",     label: "Transactions", icon: ArrowLeftRight  },
  { href: "__add__",           label: "Add",          icon: PlusCircle, isAdd: true },
  { href: "/recurring",        label: "Recurring",    icon: CalendarClock   },
];

const moreItems = [
  { href: "/budgets",  label: "Budgets",  icon: Target },
  { href: "/import",   label: "Import",   icon: FileUp },
  { href: "/reports",  label: "Reports",  icon: BarChart3 },
  { href: "/insights", label: "Insights", icon: Sparkles },
  { href: "/settings", label: "Settings", icon: Settings2 },
];

export default function MobileNav() {
  const pathname = usePathname();
  const { open: openQuickAdd } = useQuickAdd();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = moreItems.some((m) => pathname === m.href || pathname?.startsWith(m.href + "/"));

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-[var(--surface-border)] bg-[var(--surface-card)]/95 px-2 pb-safe backdrop-blur-xl lg:hidden">
        {tabs.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname?.startsWith(item.href + "/"));
          if (item.isAdd) {
            return (
              <button key={item.href} onClick={openQuickAdd} aria-label="Add transaction" className="flex flex-1 flex-col items-center gap-1 py-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand)] shadow-lg">
                  <item.icon size={18} className="text-white" />
                </div>
              </button>
            );
          }
          return (
            <Link key={item.href} href={item.href} className="flex flex-1 flex-col items-center gap-1 py-2.5">
              <item.icon size={19} className={isActive ? "text-[var(--brand)]" : "text-[var(--text-muted)]"} />
              <span className={`text-[9px] font-semibold ${isActive ? "text-[var(--brand)]" : "text-[var(--text-muted)]"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}

        <button onClick={() => setMoreOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-2.5">
          <MoreHorizontal size={19} className={moreActive ? "text-[var(--brand)]" : "text-[var(--text-muted)]"} />
          <span className={`text-[9px] font-semibold ${moreActive ? "text-[var(--brand)]" : "text-[var(--text-muted)]"}`}>
            More
          </span>
        </button>
      </nav>

      {moreOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl border-t border-[var(--surface-border)] bg-[var(--surface-card)] p-5 pb-8">
            <div className="mb-4 flex items-center justify-between">
              <p className="font-display text-base font-semibold text-[var(--text-primary)]">More</p>
              <button onClick={() => setMoreOpen(false)} className="rounded-lg p-1.5 text-[var(--text-muted)] hover:bg-[var(--surface-raised)]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {moreItems.map((m) => {
                const isActive = pathname === m.href || pathname?.startsWith(m.href + "/");
                return (
                  <Link
                    key={m.href}
                    href={m.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--surface-border)] py-4"
                  >
                    <m.icon size={20} className={isActive ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"} />
                    <span className={`text-[11px] font-medium ${isActive ? "text-[var(--brand)]" : "text-[var(--text-secondary)]"}`}>
                      {m.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
