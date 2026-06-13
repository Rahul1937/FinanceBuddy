"use client";

import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { getCategoryIcon } from "@/lib/utils/categories";

type Slice = { id: string; label: string; value: number; color?: string };

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-raised)] px-3 py-2 text-xs shadow-xl">
      <p className="font-medium text-[var(--text-primary)]">
        {getCategoryIcon(d.label)} {d.label}
      </p>
      <p className="mt-0.5 font-mono font-semibold text-[var(--brand)]">
        ₹{d.value.toLocaleString("en-IN")}
      </p>
    </div>
  );
}

export default function DonutChart({ slices }: { slices: Slice[] }) {
  const filtered = slices.filter((s) => s.value > 0);
  const total = filtered.reduce((sum, s) => sum + s.value, 0) || 1;

  if (filtered.length === 0) {
    return (
      <div className="flex h-[180px] items-center justify-center text-sm text-[var(--text-muted)]">
        No spending data for this month
      </div>
    );
  }

  return (
    <div className="fb-donut-row">
      <div className="relative h-[180px] w-[180px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={filtered}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={80}
              startAngle={90}
              endAngle={450}
              paddingAngle={3}
            >
              {filtered.map((slice) => (
                <Cell key={slice.id} fill={slice.color || "#818cf8"} stroke="transparent" />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-muted)]">total</span>
          <span className="mt-0.5 font-mono text-sm font-semibold text-[var(--text-primary)]">
            ₹{total.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      <div className="fb-legend">
        {filtered.map((slice) => (
          <div key={slice.id} className="fb-legend-item">
            <div className="fb-legend-left">
              <div className="fb-legend-dot" style={{ background: slice.color || "#818cf8" }} />
              <span className="fb-legend-name">
                {getCategoryIcon(slice.label)} {slice.label}
              </span>
            </div>
            <span className="fb-legend-val">₹{slice.value.toLocaleString("en-IN")}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
