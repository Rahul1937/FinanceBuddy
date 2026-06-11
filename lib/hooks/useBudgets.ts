import { useState } from "react";
import type { Budget } from "@/types";

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  return { budgets, setBudgets };
}
