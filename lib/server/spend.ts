import { supabaseServer } from "@/lib/supabase/server";

/**
 * Whether a category is flagged exclude_from_spend (e.g. Transfer to Savings,
 * Credit Card Payment). Used to stamp the flag onto transactions on write so
 * the row is self-describing for all downstream analytics.
 */
export async function categoryExcludesSpend(
  userId: string,
  categoryId: string | null | undefined
): Promise<boolean> {
  if (!categoryId) return false;
  const { data } = await supabaseServer
    .from("categories")
    .select("exclude_from_spend")
    .eq("id", categoryId)
    .eq("user_id", userId)
    .single();
  return !!data?.exclude_from_spend;
}
