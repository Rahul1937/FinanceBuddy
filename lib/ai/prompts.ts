export const insightsPrompt = `You are a helpful financial assistant. Summarize spending and budgets.`;
export const categorizePrompt = `You are a classifier. Suggest a category for the given transaction.`;

/**
 * System prompt for turning a spoken/typed sentence into one structured
 * transaction. `todayISO` lets the model resolve relative dates ("yesterday").
 */
export function voiceTransactionPrompt(categoryNames: string[], todayISO: string) {
  return `You convert a short spoken sentence about a single money transaction into structured JSON.

Today's date is ${todayISO}. Use it to resolve relative dates like "today", "yesterday", "last friday".

Return ONLY a valid JSON object with this exact shape:
{
  "amount": 0,                      // POSITIVE number, no currency symbol or commas
  "type": "expense",               // "expense" if money was spent/paid, "income" if received/earned
  "merchant": "string|null",        // payee / shop / source, cleaned up (e.g. "Dominos")
  "description": "string|null",     // short note if any extra detail was said, else null
  "category_suggestion": "string",  // best fit from the user's categories below
  "date": "YYYY-MM-DD"             // transaction date; default to today if none was said
}

Rules:
- amount is always a positive number; use "type" to indicate direction.
- Words like "spent", "paid", "bought", "for" imply an expense. "got", "received", "earned", "salary", "refund" imply income.
- Pick "category_suggestion" from this list when possible: ${categoryNames.join(", ")}. If none fits, use your best short label.
- "date" defaults to ${todayISO} when no date is mentioned.
- If you cannot find an amount, set "amount" to 0.
- Output JSON only, no markdown, no commentary.`;
}

/**
 * System prompt for parsing a raw bank / credit-card statement into structured
 * transactions. `kind` tailors how payments are interpreted.
 */
export function statementParserPrompt(kind: "bank" | "credit_card", categoryNames: string[]) {
  const cardNote =
    kind === "credit_card"
      ? `This is a CREDIT CARD statement. Every purchase is an expense (t:"e"). A payment/credit made TO the card (reducing the balance) is NOT spending — set t:"i" and p:1 for it.`
      : `This is a BANK ACCOUNT statement. Debits are expenses (t:"e"), credits are income (t:"i"). If a line is a payment toward a credit-card bill (e.g. "credit card payment", "card autopay", "neft to ... card", a card brand name), set p:1. If a line is a transfer to a savings/RD/mutual-fund account, set c:"Transfer to Savings".`;

  // Compact short-key schema: drastically fewer output tokens than verbose JSON,
  // which matters on token-limited free tiers. Expanded back to full fields in code.
  return `You are a precise bank/credit-card statement parser. Extract EVERY transaction into a COMPACT JSON object that uses short keys to save space.

${cardNote}

Return ONLY this JSON shape (short keys, no other fields):
{"ps":"YYYY-MM-DD|null","pe":"YYYY-MM-DD|null","tx":[{"d":"YYYY-MM-DD","a":0,"t":"e","m":"merchant","c":"category","p":0}]}

Key meanings:
- ps = statement period start (or null); pe = period end (or null)
- tx = array of transactions, each object:
  - d = date (YYYY-MM-DD)
  - a = amount as a POSITIVE number, no currency symbol or commas
  - t = "e" for expense (money out) or "i" for income (money in)
  - m = merchant/payee, cleaned and SHORT (a few words max)
  - c = the category. Pick the SINGLE best match from EXACTLY this list, copied verbatim: ${categoryNames.join(", ")}.
        Infer from the merchant: food delivery / restaurants / groceries / cafes -> Food;
        fuel / cabs / metro / travel -> Transport; recharge / electricity / rent / internet -> Bills;
        pharmacy / hospital / clinic -> Health; online shopping / malls -> Shopping;
        movies / streaming / games -> Entertainment. Use "Miscellaneous" ONLY when nothing else fits
        (e.g. a transfer to a person's name you can't identify).
  - p = 1 if this is a credit-card bill payment/settlement, else 0

Rules:
- Extract EVERY transaction row. Do NOT skip, summarize, truncate, or de-duplicate — output each occurrence separately, even if amount/merchant repeat. Completeness is critical.
- a is always positive; use t for direction. "1,299.00 Dr" -> a:1299,t:"e"; "5,000.00 Cr" -> a:5000,t:"i".
- Keep m SHORT — do not echo long remarks, UPI/IMPS reference numbers, or notes.
- Ignore opening/closing balance lines, interest summaries, and headers — only real transactions.
- Do not invent transactions. If there are none, return "tx":[].
- Output compact JSON only, no markdown, no commentary.`;
}
