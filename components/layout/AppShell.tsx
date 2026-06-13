import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--surface-base)] text-[var(--text-primary)]">
      <TopBar />
      <div className="grid min-h-[calc(100vh-88px)] gap-6 px-4 py-4 lg:grid-cols-[280px_1fr] lg:px-8 lg:py-6">
        <Sidebar />
        <main className="rounded-[2rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-card">
          {children}
        </main>
      </div>
    </div>
  );
}
