"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Transaction } from "@/types";

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);

    const { data, error } = await supabase
      .from("transactions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setError(error.message);
      setTransactions([]);
    } else {
      setTransactions(data ?? []);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchTransactions();
  }, [fetchTransactions]);

  const addTransaction = useCallback(async (transaction: Omit<Transaction, "id" | "created_at">) => {
    const { data, error } = await supabase
      .from("transactions")
      .insert([transaction])
      .select()
      .single();

    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    if (data) {
      setTransactions((current) => [data, ...current]);
    }

    return { data };
  }, []);

  const updateTransaction = useCallback(async (id: string, values: Partial<Transaction>) => {
    const { data, error } = await supabase
      .from("transactions")
      .update(values)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    if (data) {
      setTransactions((current) => current.map((item) => (item.id === id ? data : item)));
    }

    return { data };
  }, []);

  const deleteTransaction = useCallback(async (id: string) => {
    const { error } = await supabase.from("transactions").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return { error: error.message };
    }

    setTransactions((current) => current.filter((item) => item.id !== id));
    return { error: null };
  }, []);

  return {
    transactions,
    loading,
    error,
    refresh: fetchTransactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
  };
}
