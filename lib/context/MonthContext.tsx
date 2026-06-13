"use client";

import { createContext, useContext, useState, ReactNode } from "react";
import { startOfMonth, format } from "date-fns";

type MonthContextType = {
  activeMonth: Date;
  setActiveMonth: (date: Date) => void;
  activeMonthStr: string; // "YYYY-MM" for filtering
};

const MonthContext = createContext<MonthContextType>({
  activeMonth: startOfMonth(new Date()),
  setActiveMonth: () => {},
  activeMonthStr: new Date().toISOString().slice(0, 7),
});

export function MonthProvider({ children }: { children: ReactNode }) {
  const [activeMonth, setActiveMonth] = useState<Date>(startOfMonth(new Date()));
  const activeMonthStr = format(activeMonth, "yyyy-MM");

  return (
    <MonthContext.Provider value={{ activeMonth, setActiveMonth, activeMonthStr }}>
      {children}
    </MonthContext.Provider>
  );
}

export function useMonth() {
  return useContext(MonthContext);
}
