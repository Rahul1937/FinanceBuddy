import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";

export const SESSION_COOKIE_NAME = "fb_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, 64).toString("hex");

  return `${salt}:${key}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) {
    return false;
  }

  const derivedKey = scryptSync(password, salt, 64);
  return timingSafeEqual(Buffer.from(key, "hex"), derivedKey);
}

export function createSessionCookie(token: string) {
  return {
    name: SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    path: "/",
    maxAge: SESSION_MAX_AGE,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function getSessionUser(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token) {
    return null;
  }

  const { data: session, error: sessionError } = await supabaseServer
    .from("sessions")
    .select("user_id")
    .eq("token", token)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (sessionError || !session) {
    return null;
  }

  const { data: user, error: userError } = await supabaseServer
    .from("users")
    .select("id,email")
    .eq("id", session.user_id)
    .single();

  if (userError || !user) {
    return null;
  }

  return user;
}
