import React from "react";

type Props = {
  id: string;
  name: string;
  category?: string | null;
  amount: number;
  spent: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

export default function BudgetCard({ id, name, category, amount, spent, onEdit, onDelete }: Props) {
  const progress = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-lg font-semibold text-slate-100">{name || category || "General"}</p>
          <p className="text-sm text-slate-400">{category || "Uncategorized"}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-slate-100">{formatCurrency(spent)} / {formatCurrency(amount)}</p>
          <p className="text-sm text-slate-400">{progress.toFixed(0)}% used</p>
        </div>
      </div>
      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
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
  );
}

