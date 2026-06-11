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
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">Loading...</div>
          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg font-semibold">Redirecting to login...</div>
          {error && <div className="mt-2 text-sm text-red-400">{error}</div>}
        </div>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
