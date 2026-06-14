import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

function monthKey(value: string | null): string {
  const m = String(value || "").slice(0, 7);
  return /^\d{4}-\d{2}$/.test(m) ? m : new Date().toISOString().slice(0, 7);
}

// GET /api/savings?month=YYYY-MM → the savings goal for that month (or null).
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const month = monthKey(request.nextUrl.searchParams.get("month"));
  const { data, error } = await supabaseServer
    .from("savings_goals")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", `${month}-01`)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: data ? Number(data.amount) : null, month });
}

// POST /api/savings { month: "YYYY-MM", amount } → upsert the month's goal.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const month = monthKey(payload.month);
  const amount = Number(payload.amount);
  if (!Number.isFinite(amount) || amount < 0) {
    return NextResponse.json({ error: "Enter a valid goal amount." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("savings_goals")
    .upsert(
      { user_id: user.id, month: `${month}-01`, amount, updated_at: new Date().toISOString() },
      { onConflict: "user_id,month" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ goal: Number(data.amount), month });
}
