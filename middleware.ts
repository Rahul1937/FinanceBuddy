// NOTE: The client-side AppGuard handles protected routes for now.
// The middleware auth guard is disabled because Supabase auth is currently
// managed via the browser client and may not yet persist the expected cookies.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/budgets/:path*",
    "/insights/:path*",
    "/settings/:path*",
  ],
};
