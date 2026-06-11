import Link from "next/link";
import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <TopBar />
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Sidebar />
        <main className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {children}
        </main>
      </div>
    </div>
  );
}
