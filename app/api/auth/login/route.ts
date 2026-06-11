import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createSessionCookie, verifyPassword, SESSION_MAX_AGE } from "@/lib/server/auth";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
  }

  const { data: user, error: userError } = await supabaseServer
    .from("users")
    .select("id,password_hash,email")
    .eq("email", email)
    .single();

  if (userError || !user || !user.password_hash) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const isValid = verifyPassword(password, user.password_hash);
  if (!isValid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }

  const token = randomUUID();
  const userAgent = request.headers.get("user-agent") || null;
  const ip = request.headers.get("x-forwarded-for") || null;

  const { error: sessionError } = await supabaseServer.from("sessions").insert([
    {
      user_id: user.id,
      token,
      user_agent: userAgent,
      ip,
      expires_at: new Date(Date.now() + SESSION_MAX_AGE * 1000).toISOString(),
    },
  ]);

  if (sessionError) {
    return NextResponse.json({ error: "Unable to create session." }, { status: 500 });
  }

  const response = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 200 });
  response.cookies.set(createSessionCookie(token));
  return response;
}
