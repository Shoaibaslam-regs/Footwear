import { cookies } from "next/headers";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/jwt";

/** Lets client code ask "is anyone signed in?" without exposing the JWT. */
export async function GET() {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  return Response.json(
    { signedIn: !!session },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
