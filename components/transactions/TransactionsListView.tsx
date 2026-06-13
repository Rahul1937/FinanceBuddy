import React from "react";
import TransactionItem from "./TransactionItem";

type Tx = {
  id: string;
  amount: string | number;
  currency?: string;
  type: string;
  category_id?: string | null;
  merchant?: string | null;
  notes?: string | null;
  occurred_at: string;
};

export default function TransactionsListView({
  items,
  categoriesMap,
  onEdit,
  onDelete,
}: {
  items: Tx[];
  categoriesMap: Record<string, string>;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  if (!items || items.length === 0) {
    return <div className="p-6 text-sm text-slate-400">No transactions found.</div>;
  }

  return (
    <div className="space-y-3 p-4">
      {/* Mobile / stacked list */}
      <div className="md:hidden space-y-3">
        {items.map((t) => (
          <TransactionItem
            key={t.id}
            id={t.id}
            occurred_at={t.occurred_at}
            merchant={t.merchant}
            notes={t.notes}
            amount={t.amount}
            type={t.type}
            category={t.category_id ? categoriesMap[t.category_id] : "Uncategorized"}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>

      {/* Desktop table preserved for md+ */}
      <div className="hidden md:block">
        <table className="min-w-full divide-y divide-slate-800 text-left text-sm">
          <thead className="border-b border-slate-800">
            <tr>
              <th className="px-4 py-3 text-slate-400">Date</th>
              <th className="px-4 py-3 text-slate-400">Merchant</th>
              <th className="px-4 py-3 text-slate-400">Category</th>
              <th className="px-4 py-3 text-slate-400">Amount</th>
              <th className="px-4 py-3 text-slate-400">Type</th>
              <th className="px-4 py-3 text-slate-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {items.map((transaction) => (
              <tr key={transaction.id} className="border-b border-slate-800 last:border-none">
                <td className="px-4 py-4">{new Date(transaction.occurred_at).toLocaleDateString()}</td>
                <td className="px-4 py-4">{transaction.merchant || "—"}</td>
                <td className="px-4 py-4">{transaction.category_id ? categoriesMap[transaction.category_id] : "Uncategorized"}</td>
                <td className="px-4 py-4 mono">{Number(transaction.amount).toFixed(2)}</td>
                <td className="px-4 py-4">{transaction.type}</td>
                <td className="px-4 py-4 flex flex-wrap gap-2">
                  <button className="rounded-md bg-surface-raised px-3 py-1 text-sm text-slate-200" onClick={() => onEdit && onEdit(transaction.id)}>
                    Edit
                  </button>
                  <button className="rounded-md bg-rose-600 px-3 py-1 text-sm text-white" onClick={() => onDelete && onDelete(transaction.id)}>
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
