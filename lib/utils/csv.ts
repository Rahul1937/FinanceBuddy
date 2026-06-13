type Txn = {
  occurred_at: string;
  type: string;
  amount: string | number;
  merchant?: string | null;
  notes?: string | null;
  category_id?: string | null;
  exclude_from_spend?: boolean | null;
};

function cell(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function transactionsToCSV(rows: Txn[], categoryName: (id: string | null | undefined) => string): string {
  const header = ["Date", "Type", "Amount", "Merchant", "Category", "Notes", "Non-spend"];
  const lines = rows.map((t) =>
    [
      (t.occurred_at || "").slice(0, 10),
      t.type,
      t.amount,
      cell(t.merchant || ""),
      cell(categoryName(t.category_id) || ""),
      cell(t.notes || ""),
      t.exclude_from_spend ? "yes" : "no",
    ].join(",")
  );
  return [header.join(","), ...lines].join("\r\n");
}

export function downloadCSV(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
