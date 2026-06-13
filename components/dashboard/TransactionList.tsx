import React from "react";
import { getCategoryIcon } from "@/lib/utils/categories";
import { format } from "date-fns";

type Tx = {
  id: string;
  merchant?: string | null;
  notes?: string | null;
  amount: string | number;
  type: string;
  occurred_at: string;
  category_name?: string | null;
};

export default function TransactionList({ items }: { items: Tx[] }) {
  if (!items || items.length === 0) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-[var(--text-muted)]">
        No transactions this month
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {items.map((tx) => {
        const isIncome = tx.type === "income";
        const name = tx.merchant || tx.notes || "Unnamed transaction";
        const icon = tx.category_name ? getCategoryIcon(tx.category_name) : (isIncome ? "💰" : "📌");
        const iconBg = isIncome
          ? "var(--positive-soft)"
          : "var(--surface-raised)";

        let dateStr = "";
        try {
          dateStr = format(new Date(tx.occurred_at), "d MMM, h:mm a");
        } catch {
          dateStr = tx.occurred_at.slice(0, 10);
        }

        return (
          <div key={tx.id} className="fb-tx-row">
            <div className="fb-tx-icon" style={{ background: iconBg }}>
              {icon}
            </div>
            <div className="fb-tx-info">
              <div className="fb-tx-name">{name}</div>
              <div className="fb-tx-meta">
                {tx.category_name ?? "Uncategorized"} · {dateStr}
              </div>
            </div>
            <div className={`fb-tx-amount ${isIncome ? "income" : "expense"}`}>
              {isIncome ? "+" : "−"}₹{Number(tx.amount).toLocaleString("en-IN")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
