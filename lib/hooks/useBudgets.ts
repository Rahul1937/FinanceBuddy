"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Budget } from "@/types";

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBudgets = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase.from("budgets").select("*").order("month", { ascending: false });

    if (error) {
      setError(error.message);
      setBudgets([]);
    } else {
      setBudgets(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchBudgets();
  }, [fetchBudgets]);

  const setBudget = useCallback(async (budget: Omit<Budget, "id" | "created_at">) => {
    const { data, error } = await supabase.from("budgets").upsert([budget]).select().single();
    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    if (data) {
      setBudgets((current) => {
        const existing = current.findIndex((item) => item.id === data.id);
        if (existing >= 0) {
          return current.map((item) => (item.id === data.id ? data : item));
        }
        return [data, ...current];
      });
    }

    return { data };
  }, []);

  const deleteBudget = useCallback(async (id: string) => {
    const { error } = await supabase.from("budgets").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    setBudgets((current) => current.filter((budget) => budget.id !== id));
    return { error: null };
  }, []);

  return {
    budgets,
    loading,
    error,
    refresh: fetchBudgets,
    setBudget,
    deleteBudget,
  };
}
