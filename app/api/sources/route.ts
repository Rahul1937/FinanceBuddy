import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer
    .from("statement_sources")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sources: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await request.json();
  const name = String(payload.name || "").trim();
  const kind = payload.kind === "credit_card" ? "credit_card" : "bank";
  let cycleDay: number | null = null;
  if (kind === "credit_card") {
    const d = Number(payload.cycle_day);
    if (!d || d < 1 || d > 28) {
      return NextResponse.json(
        { error: "Credit cards need a statement cycle day between 1 and 28." },
        { status: 400 }
      );
    }
    cycleDay = Math.round(d);
  }
  if (!name) return NextResponse.json({ error: "Source name is required." }, { status: 400 });

  const { data, error } = await supabaseServer
    .from("statement_sources")
    .insert([{ user_id: user.id, name, kind, cycle_day: cycleDay }])
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ source: data });
}
