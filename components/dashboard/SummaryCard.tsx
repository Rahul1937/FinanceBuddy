import React from "react";

type Props = {
  label: string;
  value: string;
  sub?: string;
  trend?: { dir: "up" | "down"; text: string } | null;
};

export default function SummaryCard({ label, value, sub, trend }: Props) {
  return (
    <div className="fb-summary-card overflow-hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="fb-summary-card-label">{label}</div>
          <div className="fb-summary-card-value mono">{value}</div>
          {sub && <div className="fb-summary-card-sub">{sub}</div>}
        </div>
        <div className="relative h-16 w-16">
          <svg viewBox="0 0 52 52" className="absolute inset-0 h-full w-full">
            <circle cx="26" cy="26" r="20" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
            <circle
              cx="26"
              cy="26"
              r="20"
              fill="none"
              stroke="var(--brand)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray="125.6"
              strokeDashoffset="40"
              transform="rotate(-90 26 26)"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-semibold text-[var(--text-primary)]">{trend ? (trend.dir === "up" ? "+" : "–") : ""}</span>
          </div>
        </div>
      </div>
      {trend && (
        <div className={`fb-summary-card-trend ${trend.dir === "up" ? "up" : "down"}`}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="inline-block">
            <path d={trend.dir === "up" ? "M5 15l7-8 7 8" : "M19 9l-7 8-7-8"} strokeWidth="2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="ml-1 text-xs">{trend.text}</span>
        </div>
      )}
    </div>
  );
}
