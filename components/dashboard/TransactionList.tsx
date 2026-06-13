import React from "react";

type Tx = {
  id: string;
  merchant?: string | null;
  notes?: string | null;
  amount: string | number;
  type: string;
  occurred_at: string;
};

const iconColors = {
  expense: "rgba(244,63,94,0.12)",
  income: "rgba(16,185,129,0.12)",
};

export default function TransactionList({ items }: { items: Tx[] }) {
  if (!items || items.length === 0) {
    return <div className="text-sm text-[var(--text-muted)]">No recent transactions.</div>;
  }

  return (
    <div className="space-y-3">
      {items.map((tx) => (
        <div key={tx.id} className="fb-tx-row">
          <div className="fb-tx-icon" style={{ background: iconColors[tx.type] || "rgba(16,185,129,0.08)" }}>
            {tx.merchant ? tx.merchant.charAt(0) : "–"}
          </div>
          <div className="fb-tx-info">
            <div className="fb-tx-name">{tx.merchant || tx.notes || "Unnamed transaction"}</div>
            <div className="fb-tx-meta">{new Date(tx.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          </div>
          <div className={`fb-tx-amount ${tx.type === "income" ? "income" : "expense"}`}>
            {tx.type === "income" ? "+" : "–"}{Number(tx.amount).toFixed(0)}
          </div>
        </div>
      ))}
    </div>
  );
}
