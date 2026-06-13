"use client";

import { ReactNode, useEffect } from "react";
import { useAuth } from "@/lib/hooks/useAuth";
import AppShell from "@/components/layout/AppShell";

export default function AppGuard({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, error, requireAuth } = useAuth();

  useEffect(() => {
    if (!loading) {
      requireAuth();
    }
  }, [loading, isAuthenticated, requireAuth]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-5 text-center">
          <div className="relative flex h-16 w-16 items-center justify-center">
            <div
              className="absolute inset-0 rounded-2xl border-2 border-[var(--brand)] fb-pulse-ring opacity-60"
              style={{ boxShadow: "0 0 28px rgba(229,83,61,0.25)" }}
            />
            <span className="relative z-10 font-display text-2xl font-bold text-[var(--brand)]">₹</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">Finance Buddy</p>
            <p className="mt-1 text-xs text-[var(--text-muted)]">Loading your workspace…</p>
          </div>
          {error && <p className="text-xs text-[var(--danger)]">{error}</p>}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--surface-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--surface-border)] border-t-[var(--brand)]" />
          <p className="text-sm text-[var(--text-muted)]">Redirecting to login…</p>
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
