// Maps an AI category suggestion + merchant text to one of the user's real
// categories. Without this, anything the AI labels with a name that doesn't
// exactly match a user category falls through to "uncategorized" (Miscellaneous).
//
// Resolution order (strongest first):
//   1. exact match of the AI suggestion to a category name
//   2. keyword/synonym hit in the suggestion OR the merchant text
//   3. fuzzy (token-overlap) similarity of the suggestion to a category name

import { merchantSimilarity, normalizeMerchant } from "@/lib/utils/statements";

export type CategoryLite = { id: string; name: string; exclude_from_spend?: boolean | null };

// Canonical category name -> keywords that imply it. Canonical names match the
// app's default categories; if a user doesn't have that category, it's skipped.
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    "food", "grocery", "groceries", "supermarket", "restaurant", "dining", "cafe",
    "coffee", "swiggy", "zomato", "dominos", "mcdonald", "kfc", "pizza", "bakery",
    "biryani", "smartq", "blinkit", "zepto", "bigbasket", "instamart", "dunzo",
    "eatery", "kitchen", "canteen", "juice", "icecream",
  ],
  transport: [
    "transport", "fuel", "petrol", "diesel", "petrolpump", "gasstation", "uber",
    "ola", "rapido", "cab", "taxi", "metro", "irctc", "railway", "parking", "toll",
    "fastag", "redbus", "indianoil", "hpcl", "bharatpetroleum",
  ],
  shopping: [
    "shopping", "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "mall",
    "retail", "clothing", "apparel", "decathlon", "lifestyle", "croma", "reliancedigital",
  ],
  bills: [
    "bill", "electricity", "water", "broadband", "internet", "wifi", "recharge",
    "postpaid", "prepaid", "dth", "utility", "rent", "maintenance", "airtel", "jio",
    "vodafone", "bescom", "tneb", "actfibernet", "tatapower",
  ],
  entertainment: [
    "entertainment", "movie", "cinema", "pvr", "inox", "netflix", "spotify",
    "primevideo", "hotstar", "disney", "bookmyshow", "gaming", "subscription",
  ],
  health: [
    "health", "pharmacy", "medical", "medicine", "hospital", "clinic", "doctor",
    "apollo", "pharmeasy", "1mg", "netmeds", "gym", "fitness", "diagnostic", "cult",
  ],
  income: [
    "salary", "interest", "refund", "cashback", "dividend", "reimbursement", "payout",
  ],
};

/** lowercase, strip ALL non-alphanumerics — for spacing-agnostic keyword matching. */
function compact(s?: string | null): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Best user category for an AI suggestion + merchant, or null if none fits. */
export function matchCategory(
  suggestion: string | null | undefined,
  merchant: string | null | undefined,
  categories: CategoryLite[]
): string | null {
  if (categories.length === 0) return null;
  const byName = new Map(categories.map((c) => [normalizeMerchant(c.name), c]));

  // 1) exact suggestion -> category name
  const sug = normalizeMerchant(suggestion);
  if (sug && byName.has(sug)) return byName.get(sug)!.id;

  // 2) keyword/synonym hit in suggestion or merchant (spacing-agnostic)
  const hay = compact(suggestion) + " " + compact(merchant);
  for (const [canonical, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const cat = byName.get(canonical);
    if (!cat) continue;
    if (keywords.some((kw) => hay.includes(kw))) return cat.id;
  }

  // 3) fuzzy similarity of suggestion to a category name
  let best: CategoryLite | null = null;
  let bestScore = 0;
  for (const c of categories) {
    const score = merchantSimilarity(suggestion, c.name);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best && bestScore >= 0.5 ? best.id : null;
}

/**
 * Look up a learned merchant -> category mapping. Exact normalized match first,
 * then a token-overlap similarity fallback for slight naming variations.
 */
export function findLearnedCategory(
  learned: Map<string, string>,
  merchant: string | null | undefined
): string | null {
  const key = normalizeMerchant(merchant);
  if (!key) return null;
  if (learned.has(key)) return learned.get(key)!;

  let best: string | null = null;
  let bestScore = 0;
  for (const [k, categoryId] of learned) {
    const score = merchantSimilarity(key, k);
    if (score > bestScore) {
      bestScore = score;
      best = categoryId;
    }
  }
  return bestScore >= 0.6 ? best : null;
}
