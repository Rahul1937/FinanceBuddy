"use client";

import React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  trend?: { dir: "up" | "down"; text: string } | null;
  arcPercent?: number; // 0-100 for the arc ring
  arcColor?: string;
  icon?: React.ReactNode;
  valueColor?: string;
};

function BudgetArc({ percent, color }: { percent: number; color: string }) {
  const r = 24;
  const cx = 32;
  const cy = 32;
  const circumference = 2 * Math.PI * r;
  const offset = circumference * (1 - Math.min(percent / 100, 1));

  return (
    <svg width="64" height="64" className="shrink-0">
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke="var(--surface-border)"
        strokeWidth="5"
      />
      <circle
        cx={cx} cy={cy} r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${cx} ${cy})`}
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
    </svg>
  );
}

export default function SummaryCard({ label, value, sub, trend, arcPercent, arcColor = "var(--brand)", icon, valueColor }: Props) {
  return (
    <div className="fb-summary-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {icon && (
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--positive-soft)]">
              {icon}
            </div>
          )}
          <div className="fb-summary-card-label">{label}</div>
          <div
            className="fb-summary-card-value mono"
            style={valueColor ? { color: valueColor } : undefined}
          >
            {value}
          </div>
          {sub && <div className="fb-summary-card-sub">{sub}</div>}
          {trend && (
            <div className={`fb-summary-card-trend ${trend.dir === "up" ? "up" : "down"}`}>
              {trend.dir === "up"
                ? <TrendingUp size={11} />
                : <TrendingDown size={11} />}
              <span>{trend.text}</span>
            </div>
          )}
        </div>
        {arcPercent !== undefined && (
          <BudgetArc percent={arcPercent} color={arcColor} />
        )}
      </div>
    </div>
  );
}
