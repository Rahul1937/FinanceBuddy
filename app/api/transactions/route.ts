import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";
import { categoryExcludesSpend } from "@/lib/server/spend";
import { learnMerchantCategory } from "@/lib/server/merchantMemory";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseServer
    .from("transactions")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ transactions: data ?? [] });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = await request.json();
  const categoryId = payload.category_id || null;
  const transaction = {
    user_id: user.id,
    amount: payload.amount,
    currency: payload.currency || "INR",
    type: payload.type,
    category_id: categoryId,
    merchant: payload.merchant || null,
    notes: payload.notes || null,
    occurred_at: payload.occurred_at || new Date().toISOString(),
    exclude_from_spend: await categoryExcludesSpend(user.id, categoryId),
  };

  const { data, error } = await supabaseServer
    .from("transactions")
    .insert([transaction])
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Learn the merchant -> category choice for future statement imports.
  if (categoryId && transaction.merchant) {
    await learnMerchantCategory(user.id, transaction.merchant, categoryId);
  }

  return NextResponse.json({ transaction: data });
}
