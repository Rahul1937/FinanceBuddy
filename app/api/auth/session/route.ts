import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/server/auth";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  return NextResponse.json({ user: user ? { id: user.id, email: user.email } : null });
}
