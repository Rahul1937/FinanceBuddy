// Generates sample statement PDFs for testing the import flow — no dependencies.
// Run: node scripts/make-sample-pdfs.mjs   → writes into ./samples
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "samples");
mkdirSync(outDir, { recursive: true });

function buildPDF(lines) {
  const esc = (t) => t.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  let stream = "BT /F1 10 Tf 40 760 Td 16 TL\n";
  lines.forEach((l, i) => {
    stream += i === 0 ? `(${esc(l)}) Tj\n` : `T* (${esc(l)}) Tj\n`;
  });
  stream += "ET";

  const bodies = [
    `<< /Type /Catalog /Pages 2 0 R >>`,
    `<< /Type /Pages /Kids [3 0 R] /Count 1 >>`,
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    `<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>`,
  ];

  let out = "%PDF-1.4\n";
  const offsets = [];
  bodies.forEach((body, i) => {
    offsets[i] = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = out.length;
  out += `xref\n0 ${bodies.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((off) => (out += `${String(off).padStart(10, "0")} 00000 n \n`));
  out += `trailer\n<< /Size ${bodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(out, "latin1");
}

const bank = [
  "HDFC BANK - SAVINGS ACCOUNT STATEMENT",
  "Account No: XXXXXXXX4821     Customer: R Sharma",
  "Statement Period: 01-May-2026 to 31-May-2026",
  "",
  "Date         Description                        Amount      Type     Balance",
  "02-05-2026   UPI/Swiggy/Food Order              450.00      Dr       84550.00",
  "03-05-2026   UPI/BigBasket/Groceries            1820.00     Dr       82730.00",
  "05-05-2026   SALARY CREDIT - ACME CORP          85000.00    Cr       167730.00",
  "07-05-2026   UPI/Uber/Trip to Airport           260.00      Dr       167470.00",
  "10-05-2026   AMZN Amazon Shopping               2499.00     Dr       164971.00",
  "12-05-2026   NEFT Transfer to Savings RD        10000.00    Dr       154971.00",
  "15-05-2026   CREDIT CARD PAYMENT - ICICI CARD   18750.00    Dr       136221.00",
  "18-05-2026   UPI/Zomato/Dinner                  640.00      Dr       135581.00",
  "22-05-2026   UPI/BESCOM/Electricity Bill        1340.00     Dr       134241.00",
  "27-05-2026   UPI/Netflix/Subscription           649.00      Dr       133592.00",
  "",
  "Closing Balance: 133592.00",
];

const card = [
  "ICICI BANK CREDIT CARD STATEMENT",
  "Card No: XXXX XXXX XXXX 7702     Name: R SHARMA",
  "Statement Date: 15-May-2026     Payment Due Date: 02-Jun-2026",
  "Total Amount Due: 18750.00      Minimum Due: 950.00",
  "",
  "Date         Transaction Details                Amount      Type",
  "01-05-2026   Amazon.in Online Purchase          1299.00     Dr",
  "03-05-2026   Flipkart Internet Purchase         2150.00     Dr",
  "05-05-2026   Myntra Fashion                     3499.00     Dr",
  "08-05-2026   Big Bazaar Retail                  1850.00     Dr",
  "10-05-2026   Indian Oil Petrol Pump             2000.00     Dr",
  "12-05-2026   Apollo Pharmacy                    1200.00     Dr",
  "13-05-2026   Croma Electronics                  6752.00     Dr",
  "22-05-2026   Reliance Digital Store             4500.00     Dr",
  "",
  "Note: the 22-May purchase belongs to the next (open) billing cycle.",
];

writeFileSync(join(outDir, "hdfc-bank-may-2026.pdf"), buildPDF(bank));
writeFileSync(join(outDir, "icici-card-may-2026.pdf"), buildPDF(card));
console.log("Wrote:");
console.log("  samples/hdfc-bank-may-2026.pdf");
console.log("  samples/icici-card-may-2026.pdf");
