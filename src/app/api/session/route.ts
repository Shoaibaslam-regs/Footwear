import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/auth/dal";
import { SESSION_COOKIE } from "@/lib/auth/jwt";

/**
 * Lets client code ask "is anyone signed in?" without exposing the JWT.
 * Checked against the database: a cookie that is genuine but dead (account
 * deleted, password changed since) answers "no" and is removed, so the login
 * popup appears instead of actions failing one by one.
 */
export async function GET() {
  const jar = await cookies();
  const user = await getCurrentUser();
  if (!user && jar.get(SESSION_COOKIE)) jar.delete(SESSION_COOKIE);
  return Response.json({ signedIn: !!user }, { headers: { "Cache-Control": "private, no-store" } });
}
