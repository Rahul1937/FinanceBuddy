import { supabaseServer } from "@/lib/supabase/server";
import { categoryExcludesSpend } from "@/lib/server/spend";
import { advanceDate } from "@/lib/utils/recurring";

type Rule = {
  id: string;
  amount: number | string;
  type: string;
  category_id: string | null;
  merchant: string | null;
  notes: string | null;
  frequency: string;
  interval: number;
  next_due: string;
  end_date: string | null;
};

/**
 * Create one transaction for the rule's current next_due, then return the
 * advanced due date and whether the rule should be deactivated (past end_date).
 */
export async function postOccurrence(
  userId: string,
  rule: Rule
): Promise<{ newNextDue: string; deactivate: boolean }> {
  const exclude = await categoryExcludesSpend(userId, rule.category_id);
  await supabaseServer.from("transactions").insert([
    {
      user_id: userId,
      amount: rule.amount,
      currency: "INR",
      type: rule.type === "income" ? "income" : "expense",
      category_id: rule.category_id || null,
      merchant: rule.merchant || null,
      notes: rule.notes || null,
      occurred_at: `${rule.next_due}T00:00:00.000Z`,
      recurring_id: rule.id,
      exclude_from_spend: exclude,
    },
  ]);

  const newNextDue = advanceDate(rule.next_due, rule.frequency, rule.interval);
  const deactivate = !!rule.end_date && newNextDue > rule.end_date;
  return { newNextDue, deactivate };
}
