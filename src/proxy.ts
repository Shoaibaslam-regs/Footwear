import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/**
 * Optimistic route guard: checks only the signed JWT cookie (no DB).
 * Every admin page and action re-verifies against MongoDB in the DAL.
 */
export default async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const toLogin = () => {
    const url = new URL("/login", req.nextUrl);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  };

  if (pathname.startsWith("/admin")) {
    if (!session) return toLogin();
    if (session.role !== "admin") {
      return NextResponse.redirect(new URL("/account?denied=admin", req.nextUrl));
    }
  }

  // Accounts and checkout need a signed-in client.
  if ((pathname.startsWith("/account") || pathname.startsWith("/checkout")) && !session) return toLogin();

  if ((pathname === "/login" || pathname === "/register") && session) {
    return NextResponse.redirect(
      new URL(session.role === "admin" ? "/admin" : "/account", req.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*", "/login", "/register"],
};
