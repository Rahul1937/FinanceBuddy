import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { aiConfigured, chatJSON } from "@/lib/ai/openai";
import { voiceTransactionPrompt } from "@/lib/ai/prompts";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "Voice parsing not configured. Add an AI_API_KEY to enable." },
      { status: 503 }
    );
  }

  const { text } = await request.json();
  if (!text || typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "No speech text provided." }, { status: 400 });
  }

  // Give the model the user's real category names so it suggests an existing one.
  const { data: categories } = await supabaseServer
    .from("categories")
    .select("name")
    .eq("user_id", user.id);
  const categoryNames = (categories ?? []).map((c) => c.name);

  const todayISO = new Date().toISOString().slice(0, 10);

  try {
    const parsed = await chatJSON(
      voiceTransactionPrompt(categoryNames, todayISO),
      text.trim(),
      400
    );

    const amount = Number(parsed.amount) || 0;
    const type = parsed.type === "income" ? "income" : "expense";
    const date = /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : todayISO;

    return NextResponse.json({
      amount,
      type,
      merchant: parsed.merchant ?? null,
      description: parsed.description ?? null,
      category_suggestion: parsed.category_suggestion ?? null,
      date,
    });
  } catch (err) {
    console.error("Parse transaction error:", err);
    const message = err instanceof Error ? err.message : "Couldn't understand that. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
