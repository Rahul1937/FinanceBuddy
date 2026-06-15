import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";
import { supabaseServer } from "@/lib/supabase/server";

// Retention: roll up + delete raw transactions older than the current + previous
// 2 months for this user. Idempotent and cheap when there's nothing old to prune.
// Returns how many raw rows were pruned.
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabaseServer.rpc("prune_old_transactions", {
    p_user_id: user.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, pruned: typeof data === "number" ? data : 0 });
}
