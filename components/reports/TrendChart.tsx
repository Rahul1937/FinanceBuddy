"use client";

import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

type Row = { day: number; spend: number };

const AXIS = "#9A9082";
const GRID = "#EAE0D2";
const SPEND = "#E5533D";

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-[var(--text-primary)]">Day {label}</p>
      <p className="text-[var(--brand)]">₹{Number(payload[0].value).toLocaleString("en-IN")}</p>
    </div>
  );
}

export default function TrendChart({ data, height = 220 }: { data: Row[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SPEND} stopOpacity={0.25} />
            <stop offset="100%" stopColor={SPEND} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="day" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} interval={4} />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: GRID }} />
        <Area dataKey="spend" stroke={SPEND} strokeWidth={2} fill="url(#spendFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
