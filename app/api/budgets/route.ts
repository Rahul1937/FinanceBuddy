import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .order("month", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ budgets: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const budget = {
    user_id: user.id,
    name: payload.name,
    amount: payload.amount,
    month: payload.month,
    category_id: payload.category_id || null,
  };

  const { data, error } = await supabaseServer
    .from("budgets")
    .insert([budget])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ budget: data });
}
