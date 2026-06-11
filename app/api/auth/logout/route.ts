import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { clearSessionCookie, SESSION_COOKIE_NAME } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (token) {
    await supabaseServer.from("sessions").delete().eq("token", token);
  }

  const response = NextResponse.json({ success: true });
  response.cookies.set(clearSessionCookie());
  return response;
}
