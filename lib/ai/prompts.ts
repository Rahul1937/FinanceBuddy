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
      ? `This is a CREDIT CARD statement. Every purchase is an expense. A payment/credit you made TO the card (reducing the balance) is NOT spending — set "type":"income" and "is_card_payment":true for it.`
      : `This is a BANK ACCOUNT statement. Debits are expenses, credits are income. If a line is a payment toward a credit-card bill (e.g. "credit card payment", "card autopay", "neft to ... card", a card brand name), set "is_card_payment":true. If a line is a transfer to a savings/RD/mutual-fund account, set "category_suggestion":"Transfer to Savings".`;

  return `You are a precise financial statement parser. Extract every transaction from the statement text into JSON.

${cardNote}

Return ONLY a valid JSON object with this exact shape:
{
  "period_start": "YYYY-MM-DD",      // statement period start, or null
  "period_end": "YYYY-MM-DD",        // statement period end, or null
  "transactions": [
    {
      "date": "YYYY-MM-DD",          // transaction date
      "amount": 0,                    // POSITIVE number, no currency symbol or commas
      "type": "expense",             // "expense" or "income"
      "merchant": "string|null",      // payee / merchant, cleaned up
      "description": "string|null",   // short description
      "category_suggestion": "string",// best fit from the user's categories below
      "is_card_payment": false        // true if this is a credit-card bill payment/settlement
    }
  ]
}

Rules:
- amount is always a positive number. Use "type" to indicate direction.
- Pick "category_suggestion" from this list when possible: ${categoryNames.join(", ")}. If none fits, use your best short label.
- Convert amounts like "1,299.00 Dr" to amount 1299 type expense; "5,000.00 Cr" to amount 5000 type income.
- Ignore opening/closing balance lines, interest summaries, and headers — only real transactions.
- Do not invent transactions. If the text has none, return an empty "transactions" array.
- Output JSON only, no markdown, no commentary.`;
}
