import { NextRequest, NextResponse } from "next/server";
import { format } from "date-fns";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { postOccurrence } from "@/lib/server/recurring";

// Auto-post: for every active auto_post rule that is due, create the
// transaction(s) and advance next_due (catching up missed periods, capped).
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: rules } = await supabaseServer
    .from("recurring_rules")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .eq("auto_post", true)
    .lte("next_due", today);

  let posted = 0;
  for (const rule of rules ?? []) {
    const r = { ...rule };
    let guard = 0;
    while (
      guard < 60 &&
      r.is_active &&
      r.next_due <= today &&
      (!r.end_date || r.next_due <= r.end_date)
    ) {
      const { newNextDue, deactivate } = await postOccurrence(user.id, r);
      posted++;
      r.next_due = newNextDue;
      if (deactivate) r.is_active = false;
      guard++;
    }
    await supabaseServer
      .from("recurring_rules")
      .update({ next_due: r.next_due, is_active: r.is_active })
      .eq("id", rule.id)
      .eq("user_id", user.id);
  }

  return NextResponse.json({ posted });
}
