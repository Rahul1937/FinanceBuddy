import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { createSessionCookie, hashPassword, SESSION_MAX_AGE } from "@/lib/server/auth";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const email = String(body.email || "").trim().toLowerCase();
  const password = String(body.password || "");

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "Valid email and password are required." }, { status: 400 });
  }

  const { data: existing, error: existingError } = await supabaseServer
  .from("users")
  .select("id")
  .eq("email", email)
  .maybeSingle();

  if (existingError) {
    console.log("Error checking existing user:", existingError);
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ error: "Email is already registered." }, { status: 409 });
  }

  const password_hash = hashPassword(password);
  const { data: user, error: createError } = await supabaseServer
    .from("users")
    .insert([{ email, password_hash }])
    .select("id,email")
    .single();

  if (createError || !user) {
    return NextResponse.json({ error: "Unable to create account." }, { status: 500 });
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

  const response = NextResponse.json({ user: { id: user.id, email: user.email } }, { status: 201 });
  response.cookies.set(createSessionCookie(token));
  return response;
}
