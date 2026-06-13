"use client";

import { Bell, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { addMonths, format, subMonths } from "date-fns";
import { useMemo, useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";

export default function TopBar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const monthLabel = useMemo(() => format(currentMonth, "MMMM yyyy"), [currentMonth]);
  const firstName = useMemo(() => user?.email?.split("@")[0] ?? "Friend", [user]);
  const initials = firstName.charAt(0).toUpperCase();

  return (
    <header className="border-b border-[var(--surface-border)] bg-[#0A1120]/95 px-4 py-4 backdrop-blur-xl lg:px-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[rgba(16,185,129,0.12)] text-[var(--brand)] flex items-center justify-center text-lg font-semibold">
              ₹
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">Finance Buddy</p>
              <p className="text-sm text-[var(--text-primary)]">Precision spending, powered by data.</p>
            </div>
          </div>
        </div>

        <div className="hidden items-center gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)] md:flex">
          <button
            type="button"
            aria-label="Previous month"
            className="rounded-full p-2 transition hover:bg-white/5"
            onClick={() => setCurrentMonth((value) => subMonths(value, 1))}
          >
            <ChevronLeft size={16} />
          </button>
          <span className="min-w-[120px] text-center font-semibold">{monthLabel}</span>
          <button
            type="button"
            aria-label="Next month"
            className="rounded-full p-2 transition hover:bg-white/5"
            onClick={() => setCurrentMonth((value) => addMonths(value, 1))}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-3">
          <button type="button" className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-muted)] transition hover:bg-white/5">
            <Search size={16} />
          </button>
          <button type="button" className="relative flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-muted)] transition hover:bg-white/5">
            <Bell size={16} />
            <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface-base)]" />
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-primary)]">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(16,185,129,0.14)] text-[var(--brand)] font-semibold">
              {initials}
            </div>
            <div className="hidden sm:block">
              <p className="text-sm font-semibold">{firstName}</p>
              <p className="text-xs text-[var(--text-muted)]">Account</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
