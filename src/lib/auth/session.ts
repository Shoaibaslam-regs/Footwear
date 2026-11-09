import "server-only";
import { cookies } from "next/headers";
import {
  SESSION_COOKIE,
  SESSION_DAYS,
  signSession,
  verifySession,
  type SessionPayload,
} from "./jwt";

export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function deleteSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Reads and verifies the JWT from the request cookie. */
export async function readSession(): Promise<SessionPayload | null> {
  return verifySession((await cookies()).get(SESSION_COOKIE)?.value);
}
