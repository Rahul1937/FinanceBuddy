"use client";

import { Plus } from "lucide-react";
import { useQuickAdd } from "@/lib/context/QuickAddContext";

// Desktop-only floating quick-add. On mobile the bottom-nav center button
// already opens the same quick-add modal.
export default function Fab() {
  const { open } = useQuickAdd();
  return (
    <button
      onClick={open}
      aria-label="Add transaction"
      className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-[var(--brand)] text-white shadow-lg transition hover:bg-[var(--brand-dim)] hover:shadow-xl lg:flex"
      style={{ boxShadow: "0 10px 24px -6px rgba(229,83,61,0.5)" }}
    >
      <Plus size={24} />
    </button>
  );
}
