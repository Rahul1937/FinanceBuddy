import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dashboard") || pathname.startsWith("/transactions") || pathname.startsWith("/budgets") || pathname.startsWith("/insights") || pathname.startsWith("/settings")) {
    // Placeholder auth guard. Replace with real auth logic before deployment.
    const isAuthenticated = true;
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/transactions/:path*", "/budgets/:path*", "/insights/:path*", "/settings/:path*"],
};
