import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const payload = await request.json();
  const update: Record<string, unknown> = {};
  if (payload.name !== undefined) update.name = String(payload.name).trim();
  if (payload.kind !== undefined) update.kind = payload.kind === "credit_card" ? "credit_card" : "bank";
  if (payload.cycle_day !== undefined) {
    const d = Number(payload.cycle_day);
    update.cycle_day = d >= 1 && d <= 28 ? Math.round(d) : null;
  }

  const { data, error } = await supabaseServer
    .from("statement_sources")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const { error } = await supabaseServer
    .from("statement_sources")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
