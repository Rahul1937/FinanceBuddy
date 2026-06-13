import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";

type Slice = { id: string; label: string; value: number; color?: string };

export default function DonutChart({ slices }: { slices: Slice[] }) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;

  return (
    <div className="fb-donut-row">
      <div className="fb-donut-wrap" style={{ minWidth: 180, minHeight: 180 }}>
        <div className="relative h-[180px] w-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                dataKey="value"
                nameKey="label"
                cx="50%"
                cy="50%"
                innerRadius={55}
                outerRadius={75}
                startAngle={90}
                endAngle={450}
                paddingAngle={4}
              >
                {slices.map((slice) => (
                  <Cell key={slice.id} fill={slice.color || "#38bdf8"} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-muted)]">total</span>
            <span className="mt-1 text-sm font-semibold mono text-[var(--text-primary)]">₹{total.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="fb-legend">
        {slices.map((slice) => (
          <div key={slice.id} className="fb-legend-item">
            <div className="fb-legend-left">
              <div className="fb-legend-dot" style={{ background: slice.color || "#38bdf8" }} />
              <div className="fb-legend-name">{slice.label}</div>
            </div>
            <div className="fb-legend-val">₹{slice.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
