import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const p = await request.json();
  const update: Record<string, unknown> = {};
  if (p.category_id !== undefined) update.category_id = p.category_id || null;
  if (p.type !== undefined) update.type = p.type === "income" ? "income" : "expense";
  if (p.amount !== undefined) update.amount = Number(p.amount);
  if (p.merchant !== undefined) update.merchant = p.merchant || null;
  if (p.notes !== undefined) update.notes = p.notes || null;
  if (p.frequency !== undefined) update.frequency = p.frequency;
  if (p.interval !== undefined) update.interval = Math.max(1, Number(p.interval) || 1);
  if (p.next_due !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(p.next_due)) update.next_due = p.next_due;
  if (p.end_date !== undefined) update.end_date = /^\d{4}-\d{2}-\d{2}$/.test(p.end_date || "") ? p.end_date : null;
  if (p.is_active !== undefined) update.is_active = !!p.is_active;
  if (p.auto_post !== undefined) update.auto_post = !!p.auto_post;

  const { data, error } = await supabaseServer
    .from("recurring_rules")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { error } = await supabaseServer
    .from("recurring_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
