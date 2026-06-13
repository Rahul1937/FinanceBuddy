import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { postOccurrence } from "@/lib/server/recurring";

// Manually post the current occurrence of a rule (creates a transaction and
// advances next_due by one interval).
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { data: rule } = await supabaseServer
    .from("recurring_rules")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (!rule) return NextResponse.json({ error: "Recurring rule not found." }, { status: 404 });

  const { newNextDue, deactivate } = await postOccurrence(user.id, rule);

  const { error } = await supabaseServer
    .from("recurring_rules")
    .update({ next_due: newNextDue, is_active: !deactivate })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, nextDue: newNextDue, deactivated: deactivate });
}
