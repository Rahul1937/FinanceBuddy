"use client";

import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";

type Props = {
  id: string;
  name: string;
  category?: string | null;
  categoryColor?: string | null;
  amount: number;
  spent: number;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
};

function formatINR(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function BudgetCard({
  id, name, category, categoryColor, amount, spent, onEdit, onDelete,
}: Props) {
  const pct = amount > 0 ? Math.min((spent / amount) * 100, 100) : 0;
  const rawPct = amount > 0 ? (spent / amount) * 100 : 0;
  const isOver = rawPct > 100;
  const isWarn = !isOver && rawPct > 80;

  const barColor = isOver ? "var(--danger)" : isWarn ? "var(--warning)" : "var(--positive)";
  const pctColor = isOver ? "var(--danger)" : isWarn ? "var(--warning)" : "var(--text-muted)";

  const icon = category ? getCategoryIcon(category) : "📌";
  const iconBg = categoryColor ? `${categoryColor}20` : "var(--surface-card)";

  return (
    <div className="group rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-raised)] p-4 transition hover:border-[var(--brand)]/40">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-xl text-lg"
            style={{ background: iconBg }}
          >
            {icon}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--text-primary)]">{category || name || "General"}</p>
            <p className="text-[11px] text-[var(--text-muted)]">
              {formatINR(spent)} of {formatINR(amount)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-bold" style={{ color: pctColor }}>
            {rawPct > 999 ? "999+" : Math.round(rawPct)}%
          </span>
          <div className="flex gap-0.5 opacity-0 transition group-hover:opacity-100">
            {onEdit && (
              <button
                onClick={() => onEdit(id)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-card)] hover:text-[var(--text-primary)]"
              >
                <Pencil size={12} />
              </button>
            )}
            {onDelete && (
              <button
                onClick={() => onDelete(id)}
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[rgba(244,63,94,0.12)] hover:text-[var(--danger)]"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="fb-progress-bg">
        <div className="fb-progress-fill" style={{ width: `${pct}%`, background: barColor }} />
      </div>

      {(isOver || isWarn) && (
        <p className="mt-1.5 text-[11px] font-medium" style={{ color: barColor }}>
          {isOver
            ? `Over by ${formatINR(spent - amount)}`
            : `${formatINR(amount - spent)} remaining`}
        </p>
      )}
    </div>
  );
}
