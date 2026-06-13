import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

const FREQUENCIES = new Set(["daily", "weekly", "monthly", "yearly"]);

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("recurring_rules")
    .select("*")
    .eq("user_id", user.id)
    .order("next_due", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rules: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const p = await request.json();
  const amount = Number(p.amount);
  const frequency = String(p.frequency || "monthly");
  const nextDue = String(p.next_due || "");

  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount must be greater than zero." }, { status: 400 });
  if (!FREQUENCIES.has(frequency)) return NextResponse.json({ error: "Invalid frequency." }, { status: 400 });
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDue)) return NextResponse.json({ error: "A valid next-due date is required." }, { status: 400 });

  const row = {
    user_id: user.id,
    category_id: p.category_id || null,
    type: p.type === "income" ? "income" : "expense",
    amount,
    merchant: p.merchant || null,
    notes: p.notes || null,
    frequency,
    interval: Math.max(1, Number(p.interval) || 1),
    next_due: nextDue,
    end_date: /^\d{4}-\d{2}-\d{2}$/.test(p.end_date || "") ? p.end_date : null,
    is_active: true,
    auto_post: !!p.auto_post,
  };

  const { data, error } = await supabaseServer.from("recurring_rules").insert([row]).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rule: data });
}
