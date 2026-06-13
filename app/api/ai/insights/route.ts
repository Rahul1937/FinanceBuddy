import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { aiConfigured, chatJSON } from "@/lib/ai/openai";

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { transactions, budgets, month } = await request.json();

  if (!aiConfigured()) {
    return NextResponse.json(
      { error: "AI insights not configured. Add an AI_API_KEY to enable." },
      { status: 503 }
    );
  }

  const expenses = (transactions ?? []).filter((t: any) => t.type === "expense" && !t.exclude_from_spend);
  const totalSpent = expenses.reduce((s: number, t: any) => s + Number(t.amount), 0);
  const totalBudget = (budgets ?? []).reduce((s: number, b: any) => s + Number(b.amount), 0);

  const systemPrompt = `You are a friendly personal finance advisor. Given the user's transactions and budgets for the month, provide 3-5 concise, actionable insights. Be specific — mention amounts and categories. Tone: helpful, non-judgmental. Respond ONLY with a valid JSON object with two fields: "summary" (string, 1-2 sentences) and "tips" (array of 3-5 strings).`;

  const userContent = `Month: ${month}
Currency: INR
Total spent: ₹${totalSpent.toFixed(0)}
Total budget: ₹${totalBudget.toFixed(0)}

Budgets: ${JSON.stringify(budgets?.slice(0, 10))}

Recent transactions (up to 30): ${JSON.stringify(
    expenses.slice(0, 30).map((t: any) => ({
      merchant: t.merchant,
      amount: t.amount,
      occurred_at: t.occurred_at?.slice(0, 10),
    }))
  )}

Provide a spending summary and actionable tips.`;

  try {
    const parsed = await chatJSON(systemPrompt, userContent, 800);
    return NextResponse.json({
      summary: parsed.summary ?? "",
      tips: Array.isArray(parsed.tips) ? parsed.tips : [],
    });
  } catch (err) {
    console.error("Insights error:", err);
    const message = err instanceof Error ? err.message : "Failed to generate insights. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
