"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import QuickAddModal from "@/components/transactions/QuickAddModal";

type QuickAddContextType = { open: () => void };

const QuickAddContext = createContext<QuickAddContextType>({ open: () => {} });

export function QuickAddProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <QuickAddContext.Provider value={{ open: () => setIsOpen(true) }}>
      {children}
      <QuickAddModal open={isOpen} onClose={() => setIsOpen(false)} />
    </QuickAddContext.Provider>
  );
}

export function useQuickAdd() {
  return useContext(QuickAddContext);
}
