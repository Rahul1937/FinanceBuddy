"use client";

import { useMemo, useState } from "react";
import { Ban, Copy, Check } from "lucide-react";
import { getCategoryIcon } from "@/lib/utils/categories";

export type ReviewRow = {
  tempId: number;
  date: string;
  amount: number;
  type: "expense" | "income" | string;
  merchant: string | null;
  description: string | null;
  categoryId: string | null;
  categoryName: string | null;
  excludeFromSpend: boolean;
  isCardPayment: boolean;
  blocked: boolean;
  blockedReason: string | null;
  duplicate: boolean;
};

type Category = { id: string; name: string; exclude_from_spend?: boolean | null };

export type CommitRow = {
  date: string;
  amount: number;
  type: string;
  merchant: string | null;
  description: string | null;
  categoryId: string | null;
  excludeFromSpend: boolean;
};

function formatINR(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

export default function ReviewTable({
  rows,
  categories,
  committing,
  onCommit,
}: {
  rows: ReviewRow[];
  categories: Category[];
  committing: boolean;
  onCommit: (selected: CommitRow[]) => void;
}) {
  // Per-row selection + category override. Blocked rows can never be selected.
  const [state, setState] = useState<Record<number, { selected: boolean; categoryId: string | null }>>(
    () =>
      Object.fromEntries(
        rows.map((r) => [r.tempId, { selected: !r.blocked && !r.duplicate, categoryId: r.categoryId }])
      )
  );

  const catById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const selectedRows = rows.filter((r) => !r.blocked && state[r.tempId]?.selected);

  const toggle = (id: number) =>
    setState((s) => ({ ...s, [id]: { ...s[id], selected: !s[id].selected } }));

  const setCategory = (id: number, categoryId: string) =>
    setState((s) => ({ ...s, [id]: { ...s[id], categoryId: categoryId || null } }));

  const handleCommit = () => {
    const payload: CommitRow[] = selectedRows.map((r) => {
      const chosen = state[r.tempId].categoryId;
      const cat = chosen ? catById.get(chosen) : null;
      return {
        date: r.date,
        amount: r.amount,
        type: r.type,
        merchant: r.merchant,
        description: r.description,
        categoryId: chosen,
        excludeFromSpend: r.isCardPayment || !!cat?.exclude_from_spend,
      };
    });
    onCommit(payload);
  };

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        {rows.map((r) => {
          const st = state[r.tempId];
          const isIncome = r.type === "income";
          return (
            <div
              key={r.tempId}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition ${
                r.blocked
                  ? "border-[var(--surface-border)] bg-[var(--surface-raised)] opacity-60"
                  : st?.selected
                  ? "border-[var(--brand)]/40 bg-[var(--surface-card)]"
                  : "border-[var(--surface-border)] bg-[var(--surface-card)]"
              }`}
            >
              <input
                type="checkbox"
                disabled={r.blocked}
                checked={!!st?.selected}
                onChange={() => toggle(r.tempId)}
                className="h-4 w-4 shrink-0 accent-[var(--brand)] disabled:opacity-40"
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {r.merchant || r.description || "Unnamed"}
                  </span>
                  {r.blocked && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--surface-raised)] px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)]">
                      <Ban size={10} /> {r.blockedReason}
                    </span>
                  )}
                  {!r.blocked && r.duplicate && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[rgba(217,119,6,0.12)] px-2 py-0.5 text-[10px] font-semibold text-[var(--warning)]">
                      <Copy size={10} /> Already added
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[11px] text-[var(--text-muted)]">
                  <span>{r.date}</span>
                  <span>·</span>
                  <select
                    value={st?.categoryId ?? ""}
                    disabled={r.blocked}
                    onChange={(e) => setCategory(r.tempId, e.target.value)}
                    className="max-w-[160px] truncate rounded-md border border-[var(--surface-border)] bg-[var(--surface-raised)] px-1.5 py-0.5 text-[11px] text-[var(--text-secondary)] outline-none disabled:opacity-50"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {getCategoryIcon(c.name)} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div
                className="shrink-0 font-mono text-sm font-semibold tabular-nums"
                style={{ color: isIncome ? "var(--positive)" : "var(--text-primary)" }}
              >
                {isIncome ? "+" : "−"}{formatINR(r.amount)}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleCommit}
        disabled={committing || selectedRows.length === 0}
        className="fb-add-btn w-full justify-center disabled:opacity-50"
      >
        <Check size={15} />
        {committing
          ? "Importing…"
          : selectedRows.length === 0
          ? "Nothing selected"
          : `Import ${selectedRows.length} transaction${selectedRows.length !== 1 ? "s" : ""}`}
      </button>
    </div>
  );
}
