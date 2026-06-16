import { supabaseServer } from "@/lib/supabase/server";
import { normalizeMerchant } from "@/lib/utils/statements";

// Persistent merchant -> category memory. The app learns the category you assign
// to a merchant (on import commit, manual add, or edit) and reuses it for future
// imports of the same merchant. Stored normalized so naming is consistent, and it
// survives transaction pruning (unlike deriving from raw rows).

/** All learned merchant -> categoryId mappings for a user, keyed by normalized merchant. */
export async function getMerchantCategoryMap(userId: string): Promise<Map<string, string>> {
  const { data } = await supabaseServer
    .from("merchant_categories")
    .select("merchant_key, category_id")
    .eq("user_id", userId);

  const map = new Map<string, string>();
  for (const r of data ?? []) {
    if (r.merchant_key && r.category_id) map.set(r.merchant_key, r.category_id);
  }
  return map;
}

/** Remember a single merchant -> category mapping (upsert). */
export async function learnMerchantCategory(
  userId: string,
  merchant: string | null | undefined,
  categoryId: string | null | undefined
): Promise<void> {
  const key = normalizeMerchant(merchant);
  if (!key || !categoryId) return;
  await supabaseServer
    .from("merchant_categories")
    .upsert(
      { user_id: userId, merchant_key: key, category_id: categoryId, updated_at: new Date().toISOString() },
      { onConflict: "user_id,merchant_key" }
    );
}

/** Remember many merchant -> category mappings at once (e.g. on import commit). */
export async function learnMerchantCategories(
  userId: string,
  rows: { merchant?: string | null; categoryId?: string | null }[]
): Promise<void> {
  // Dedupe by merchant key (last write wins), drop rows without both fields.
  const byKey = new Map<string, string>();
  for (const r of rows) {
    const key = normalizeMerchant(r.merchant);
    if (key && r.categoryId) byKey.set(key, r.categoryId);
  }
  if (byKey.size === 0) return;

  const now = new Date().toISOString();
  const payload = Array.from(byKey.entries()).map(([merchant_key, category_id]) => ({
    user_id: userId,
    merchant_key,
    category_id,
    updated_at: now,
  }));
  await supabaseServer.from("merchant_categories").upsert(payload, { onConflict: "user_id,merchant_key" });
}
