import type { ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import MobileNav from "@/components/layout/MobileNav";
import Fab from "@/components/layout/Fab";
import Toaster from "@/components/ui/Toaster";
import PruneOnLoad from "@/components/layout/PruneOnLoad";
import RunDueOnLoad from "@/components/layout/RunDueOnLoad";
import { MonthProvider } from "@/lib/context/MonthContext";
import { QuickAddProvider } from "@/lib/context/QuickAddContext";

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <MonthProvider>
      <QuickAddProvider>
        <div className="flex h-screen overflow-hidden bg-[var(--surface-base)] text-[var(--text-primary)]">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <TopBar />
            <main className="flex-1 overflow-y-auto pb-20 lg:pb-0">
              {children}
            </main>
          </div>
        </div>
        <MobileNav />
        <Fab />
        <Toaster />
        <PruneOnLoad />
        <RunDueOnLoad />
      </QuickAddProvider>
    </MonthProvider>
  );
}
