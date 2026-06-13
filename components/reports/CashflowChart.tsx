"use client";

import { Bar, Line, ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format, parseISO } from "date-fns";

type Row = { month: string; income: number; spend: number };

const AXIS = "#9A9082";
const GRID = "#EAE0D2";
const INCOME = "#0E9888";
const SPEND = "#E5533D";
const SAVINGS = "#1C1A17";

function inr(v: number) {
  return `₹${Number(v).toLocaleString("en-IN")}`;
}

function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload as Row;
  const savings = d.income - d.spend;
  return (
    <div className="rounded-xl border border-[var(--surface-border)] bg-[var(--surface-card)] px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold text-[var(--text-primary)]">{label}</p>
      <p className="text-[var(--positive)]">Income: {inr(d.income)}</p>
      <p className="text-[var(--brand)]">Spend: {inr(d.spend)}</p>
      <p className="text-[var(--text-secondary)]">Net: {inr(savings)}</p>
    </div>
  );
}

export default function CashflowChart({ data, height = 260 }: { data: Row[]; height?: number }) {
  const rows = data.map((d) => ({
    ...d,
    savings: d.income - d.spend,
    label: format(parseISO(`${d.month}-01`), "MMM"),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={rows} margin={{ top: 8, right: 4, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID} />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 11, fill: AXIS }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => (v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`)}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="income" name="Income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Bar dataKey="spend" name="Spend" fill={SPEND} radius={[4, 4, 0, 0]} maxBarSize={26} />
        <Line dataKey="savings" name="Net" stroke={SAVINGS} strokeWidth={2} dot={{ r: 2.5 }} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
