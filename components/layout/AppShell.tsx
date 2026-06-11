import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <TopBar />
      <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <Sidebar />
        <main className="rounded-[2rem] border border-slate-800 bg-slate-900/90 p-6 shadow-[0_25px_50px_-25px_rgba(15,23,42,0.8)]">
          {children}
        </main>
      </div>
    </div>
  );
}
