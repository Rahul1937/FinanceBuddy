import { useState } from "react";
import type { Transaction } from "@/types";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  return { transactions, setTransactions };
}
