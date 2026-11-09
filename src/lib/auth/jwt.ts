import { jwtVerify, SignJWT } from "jose";

/**
 * JWT helpers shared by the server (DAL, actions) and proxy.ts.
 * The token only carries the user id and role, never personal data.
 */
export const SESSION_COOKIE = "elora_session";
export const SESSION_DAYS = 7;

export type Role = "customer" | "admin";
export type SessionPayload = { sub: string; role: Role; /** issued-at, seconds */ iat?: number };

function key() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set and at least 32 characters");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ role: payload.role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(key());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    const role = payload.role;
    if (!payload.sub || (role !== "customer" && role !== "admin")) return null;
    return { sub: payload.sub, role, iat: payload.iat };
  } catch {
    return null;
  }
}
