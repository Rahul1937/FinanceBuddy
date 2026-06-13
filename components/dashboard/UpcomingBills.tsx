"use client";

import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";
import { dueLabel, ruleStatus, type RecurringRule } from "@/lib/utils/recurring";

type Category = { id: string; name: string; color: string | null };

export default function UpcomingBills({
  rules,
  categoryMap,
  postingId,
  onPost,
}: {
  rules: RecurringRule[];
  categoryMap: Record<string, Category>;
  postingId: string | null;
  onPost: (id: string) => void;
}) {
  if (rules.length === 0) return null;

  return (
    <div className="fb-card">
      <div className="fb-card-title">
        <span className="flex items-center gap-2"><CalendarClock size={15} /> Upcoming bills</span>
        <Link href="/recurring" className="fb-card-badge cursor-pointer transition hover:text-[var(--brand)]">Manage →</Link>
      </div>
      <div className="space-y-1.5">
        {rules.map((r) => {
          const cat = r.category_id ? categoryMap[r.category_id] : null;
          const status = ruleStatus(r);
          const isIncome = r.type === "income";
          const statusColor =
            status === "overdue" ? "var(--danger)" : status === "due-soon" ? "var(--warning)" : "var(--text-muted)";
          return (
            <div key={r.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-base"
                style={{ background: cat?.color ? `${cat.color}22` : "var(--surface-raised)" }}
              >
                {cat ? getCategoryIcon(cat.name) : isIncome ? "💰" : "🔁"}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {r.merchant || cat?.name || "Recurring"}
                </p>
                <p className="text-[11px] font-medium" style={{ color: statusColor }}>{dueLabel(r.next_due)}</p>
              </div>
              <span
                className="shrink-0 font-mono text-sm font-semibold tabular-nums"
                style={{ color: isIncome ? "var(--positive)" : "var(--text-primary)" }}
              >
                {isIncome ? "+" : "−"}₹{Number(r.amount).toLocaleString("en-IN")}
              </span>
              <button
                onClick={() => onPost(r.id)}
                disabled={postingId === r.id}
                className="shrink-0 rounded-lg bg-[var(--brand-soft)] px-2.5 py-1 text-[11px] font-semibold text-[var(--brand)] transition hover:bg-[var(--brand)] hover:text-white disabled:opacity-50"
              >
                {postingId === r.id ? "…" : isIncome ? "Add" : "Pay"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
