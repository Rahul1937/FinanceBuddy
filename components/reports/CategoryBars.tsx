"use client";

import { getCategoryColor, getCategoryIcon } from "@/lib/utils/categories";

type Row = { name: string; total: number };

export default function CategoryBars({ data, limit = 8 }: { data: Row[]; limit?: number }) {
  const top = data.slice(0, limit);
  const max = Math.max(...top.map((d) => d.total), 1);
  const total = data.reduce((s, d) => s + d.total, 0) || 1;

  if (top.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--text-muted)]">No spending in this period.</p>;
  }

  return (
    <div className="space-y-3">
      {top.map((d) => {
        const color = getCategoryColor(d.name);
        const pct = (d.total / total) * 100;
        return (
          <div key={d.name}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-[var(--text-secondary)]">{getCategoryIcon(d.name)} {d.name}</span>
              <span className="font-mono text-[var(--text-primary)]">
                ₹{d.total.toLocaleString("en-IN")} · {pct.toFixed(0)}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div className="h-2 rounded-full" style={{ width: `${(d.total / max) * 100}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
