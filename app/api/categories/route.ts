import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

const defaultCategories = [
  { name: "Food", color: "#f97316" },
  { name: "Transport", color: "#22c55e" },
  { name: "Shopping", color: "#818cf8" },
  { name: "Bills", color: "#38bdf8" },
  { name: "Entertainment", color: "#fb7185" },
  { name: "Health", color: "#34d399" },
  { name: "Income", color: "#facc15" },
];

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("categories")
    .select("*")
    .eq("user_id", user.id)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data || data.length === 0) {
    const { data: seeded, error: seedError } = await supabaseServer
      .from("categories")
      .insert(defaultCategories.map((category) => ({
        user_id: user.id,
        name: category.name,
        color: category.color,
      })))
      .select();

    if (seedError) {
      return NextResponse.json({ error: seedError.message }, { status: 500 });
    }

    return NextResponse.json({ categories: seeded ?? [] });
  }

  return NextResponse.json({ categories: data });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const name = String(payload.name || "").trim();
  const color = String(payload.color || "#818cf8").trim();

  if (!name) {
    return NextResponse.json({ error: "Category name is required." }, { status: 400 });
  }

  const { data, error } = await supabaseServer
    .from("categories")
    .insert([{ user_id: user.id, name, color }])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category: data });
}
