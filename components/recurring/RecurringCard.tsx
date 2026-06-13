"use client";

import { Pencil, Trash2, Pause, Play, Zap } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";
import { frequencyLabel, ruleStatus, dueLabel, type RecurringRule } from "@/lib/utils/recurring";

type Props = {
  rule: RecurringRule;
  categoryName?: string | null;
  categoryColor?: string | null;
  posting?: boolean;
  onPost: (id: string) => void;
  onEdit: (rule: RecurringRule) => void;
  onTogglePause: (rule: RecurringRule) => void;
  onDelete: (id: string) => void;
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function RecurringCard({
  rule, categoryName, categoryColor, posting, onPost, onEdit, onTogglePause, onDelete,
}: Props) {
  const isIncome = rule.type === "income";
  const status = ruleStatus(rule);
  const name = rule.merchant || categoryName || "Recurring";
  const icon = categoryName ? getCategoryIcon(categoryName) : isIncome ? "💰" : "🔁";
  const iconBg = categoryColor ? `${categoryColor}22` : "var(--surface-raised)";

  const statusColor =
    status === "overdue" ? "var(--danger)" :
    status === "due-soon" ? "var(--warning)" :
    status === "paused" ? "var(--text-muted)" :
    "var(--text-muted)";

  return (
    <div className="rounded-2xl border border-[var(--surface-border)] bg-[var(--surface-card)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg" style={{ background: iconBg }}>
          {icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-[var(--text-primary)]">{name}</p>
            {rule.auto_post && (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-[var(--brand-soft)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--brand)]">
                <Zap size={9} /> Auto
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
            {categoryName || "Uncategorized"} · {frequencyLabel(rule.frequency, rule.interval)}
          </p>
        </div>

        <div className="shrink-0 text-right">
          <p
            className="font-mono text-sm font-semibold tabular-nums"
            style={{ color: isIncome ? "var(--positive)" : "var(--text-primary)" }}
          >
            {isIncome ? "+" : "−"}{formatINR(Number(rule.amount))}
          </p>
          <p className="mt-0.5 text-[11px] font-medium" style={{ color: statusColor }}>
            {status === "paused" ? "Paused" : dueLabel(rule.next_due)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5">
        <button
          onClick={() => onPost(rule.id)}
          disabled={posting || !rule.is_active}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-[var(--brand-soft)] py-1.5 text-xs font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white disabled:opacity-50"
        >
          {posting ? "Posting…" : isIncome ? "Add income now" : "Mark paid now"}
        </button>
        <button
          onClick={() => onTogglePause(rule)}
          title={rule.is_active ? "Pause" : "Resume"}
          className="rounded-lg border border-[var(--surface-border)] p-1.5 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          {rule.is_active ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button
          onClick={() => onEdit(rule)}
          title="Edit"
          className="rounded-lg border border-[var(--surface-border)] p-1.5 text-[var(--text-muted)] transition hover:text-[var(--text-primary)]"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={() => onDelete(rule.id)}
          title="Delete"
          className="rounded-lg border border-[var(--surface-border)] p-1.5 text-[var(--text-muted)] transition hover:border-[var(--danger)]/40 hover:text-[var(--danger)]"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
