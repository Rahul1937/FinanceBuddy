import React from "react";

type Props = {
  id: string;
  occurred_at: string;
  merchant?: string | null;
  notes?: string | null;
  amount: number | string;
  type: string;
  category?: string | null;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return value;
  }
}

export default function TransactionItem({ id, occurred_at, merchant, notes, amount, type, category, onEdit, onDelete }: Props) {
  const isIncome = type === "income";
  return (
    <div className="fb-tx-item flex items-center justify-between gap-4 rounded-2xl bg-surface-card p-3">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-surface-raised flex items-center justify-center text-sm font-medium">{merchant ? merchant.charAt(0) : "—"}</div>
        <div>
          <div className="text-sm font-medium text-white">{merchant || notes || "Unnamed"}</div>
          <div className="text-xs text-slate-400">{category || "Uncategorized"} • {formatDate(occurred_at)}</div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-4">
        <div className={`mono text-sm ${isIncome ? "text-brand" : "text-rose-400"}`}>{isIncome ? "+" : "−"}{Number(amount).toFixed(2)}</div>
        <div className="flex gap-2">
          {onEdit && (
            <button className="rounded-md bg-surface-raised px-3 py-1 text-sm text-slate-200" onClick={() => onEdit(id)}>
              Edit
            </button>
          )}
          {onDelete && (
            <button className="rounded-md bg-rose-600 px-3 py-1 text-sm text-white" onClick={() => onDelete(id)}>
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

