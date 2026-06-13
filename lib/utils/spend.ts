// Helpers for the exclude_from_spend rule.
// "Non-spend" transactions (Transfer to Savings, Credit Card Payment, etc.) are
// outflows that aren't consumption — they're excluded from spend totals, budgets
// and category charts, but still appear in cashflow and transaction lists.

export type CategoryLike = {
  id: string;
  name?: string | null;
  exclude_from_spend?: boolean | null;
};

export type TxnLike = {
  type: string;
  amount: string | number;
  category_id?: string | null;
  exclude_from_spend?: boolean | null;
};

/** Set of category ids flagged exclude_from_spend, for fast lookup. */
export function excludedCategoryIds(categories: CategoryLike[]): Set<string> {
  return new Set(categories.filter((c) => c.exclude_from_spend).map((c) => c.id));
}

/** True when a transaction counts as real consumption spend. */
export function isSpend(txn: TxnLike, excluded: Set<string>): boolean {
  if (txn.type !== "expense") return false;
  if (txn.exclude_from_spend) return false;
  if (txn.category_id && excluded.has(txn.category_id)) return false;
  return true;
}

/** True when a transaction counts as real income (not an excluded transfer). */
export function isIncome(txn: TxnLike, excluded: Set<string>): boolean {
  if (txn.type !== "income") return false;
  if (txn.exclude_from_spend) return false;
  if (txn.category_id && excluded.has(txn.category_id)) return false;
  return true;
}

/** Sum of consumption spend across transactions. */
export function sumSpend(txns: TxnLike[], excluded: Set<string>): number {
  return txns.reduce((s, t) => (isSpend(t, excluded) ? s + Number(t.amount || 0) : s), 0);
}
