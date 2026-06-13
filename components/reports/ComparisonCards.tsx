"use client";

import { TrendingUp, TrendingDown } from "lucide-react";

type MonthData = { income: number; spend: number } | null;

function inr(v: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);
}

function Delta({ cur, prev, goodWhenUp }: { cur: number; prev: number | null; goodWhenUp: boolean }) {
  if (prev === null || prev === 0) return null;
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  if (!isFinite(pct) || Math.abs(pct) < 0.5) return null;
  const up = pct > 0;
  const good = up === goodWhenUp;
  return (
    <span
      className="mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{
        background: good ? "var(--positive-soft)" : "rgba(229,83,61,0.10)",
        color: good ? "var(--positive)" : "var(--negative)",
      }}
    >
      {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
      {Math.abs(pct).toFixed(0)}% vs last month
    </span>
  );
}

function Card({ label, value, valueColor, children }: { label: string; value: string; valueColor?: string; children?: React.ReactNode }) {
  return (
    <div className="fb-summary-card">
      <div className="fb-summary-card-label">{label}</div>
      <div className="fb-summary-card-value mono" style={valueColor ? { color: valueColor } : undefined}>{value}</div>
      {children}
    </div>
  );
}

export default function ComparisonCards({ current, previous }: { current: MonthData; previous: MonthData }) {
  const cIncome = current?.income ?? 0;
  const cSpend = current?.spend ?? 0;
  const cSavings = cIncome - cSpend;
  const rate = cIncome > 0 ? (cSavings / cIncome) * 100 : 0;

  const pIncome = previous ? previous.income : null;
  const pSpend = previous ? previous.spend : null;
  const pSavings = previous ? previous.income - previous.spend : null;

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="Spent" value={inr(cSpend)}>
        <Delta cur={cSpend} prev={pSpend} goodWhenUp={false} />
      </Card>
      <Card label="Income" value={inr(cIncome)} valueColor="var(--positive)">
        <Delta cur={cIncome} prev={pIncome} goodWhenUp={true} />
      </Card>
      <Card label="Net savings" value={inr(cSavings)} valueColor={cSavings >= 0 ? "var(--positive)" : "var(--danger)"}>
        <Delta cur={cSavings} prev={pSavings} goodWhenUp={true} />
      </Card>
      <Card label="Savings rate" value={`${Math.round(rate)}%`} valueColor={rate >= 0 ? "var(--text-primary)" : "var(--danger)"} />
    </div>
  );
}
