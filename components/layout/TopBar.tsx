"use client";

import { Bell, ChevronLeft, ChevronRight, LogOut, Settings, User } from "lucide-react";
import { addMonths, format, subMonths } from "date-fns";
import { useState } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import { useMonth } from "@/lib/context/MonthContext";

export default function TopBar() {
  const { user, signOut } = useAuth();
  const { activeMonth, setActiveMonth } = useMonth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const firstName = user?.email?.split("@")[0] ?? "Account";
  const initials  = firstName.charAt(0).toUpperCase();
  const monthLabel = format(activeMonth, "MMMM yyyy");

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <header className="relative z-30 flex shrink-0 items-center justify-between border-b border-[var(--surface-border)] bg-[var(--surface-card)]/95 px-5 py-3 backdrop-blur-xl">
      {/* Left — greeting */}
      <div className="hidden sm:block">
        <p className="text-sm text-[var(--text-muted)]">
          {greeting},{" "}
          <span className="font-semibold text-[var(--text-primary)]">{firstName}</span>
        </p>
      </div>

      {/* Mobile logo */}
      <div className="flex items-center gap-2 sm:hidden">
        <div className="flex h-7 w-7 items-center justify-center rounded-xl bg-[var(--brand-soft)]">
          <span className="text-sm font-bold text-[var(--brand)]">₹</span>
        </div>
        <span className="text-sm font-semibold text-[var(--text-primary)]">Finance Buddy</span>
      </div>

      {/* Center — Month picker */}
      <div className="flex items-center gap-2 rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-1.5">
        <button
          type="button"
          aria-label="Previous month"
          onClick={() => setActiveMonth(subMonths(activeMonth, 1))}
          className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={15} />
        </button>
        <span className="min-w-[110px] text-center text-sm font-semibold text-[var(--text-primary)]">
          {monthLabel}
        </span>
        <button
          type="button"
          aria-label="Next month"
          onClick={() => setActiveMonth(addMonths(activeMonth, 1))}
          className="rounded-lg p-1 text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Right — actions */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)]"
        >
          <Bell size={15} />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--danger)] ring-2 ring-[var(--surface-base)]" />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen((v) => !v)}
            className="flex items-center gap-2 rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-2.5 py-1.5 transition hover:bg-[var(--surface-raised)]"
          >
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--brand-soft)] text-xs font-bold text-[var(--brand)]">
              {initials}
            </div>
            <span className="hidden text-sm font-medium text-[var(--text-primary)] sm:block">
              {firstName}
            </span>
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 top-full z-20 mt-2 w-48 overflow-hidden rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] shadow-xl">
                <div className="border-b border-[var(--surface-border)] px-4 py-3">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{firstName}</p>
                  <p className="truncate text-[11px] text-[var(--text-muted)]">{user?.email}</p>
                </div>
                <a
                  href="/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
                >
                  <Settings size={14} />
                  Settings
                </a>
                <button
                  type="button"
                  onClick={() => { setDropdownOpen(false); signOut(); }}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-[var(--danger)] transition hover:bg-[rgba(244,63,94,0.08)]"
                >
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
