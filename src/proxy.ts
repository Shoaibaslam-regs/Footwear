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

  // /login and /register are not redirected here: a cookie can be genuine but
  // dead (account deleted, password changed, role changed), which only the
  // database knows. Sending such a visitor from /login to /account, which sends
  // them back to /login, would loop for ever. Those pages check the DB instead.

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/account/:path*", "/checkout/:path*"],
};
