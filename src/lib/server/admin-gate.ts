import "server-only";
import { timingSafeEqual } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

/**
 * The hidden admin login. Typing ADMIN_SECRET into the login form's email box
 * opens the admin login step; admin accounts can only log in there. Without
 * ADMIN_SECRET set (12+ characters) the gate is off and admins log in normally,
 * so nobody gets locked out by a missing setting.
 */
const MIN_LENGTH = 12;
const AUDIENCE = "admin-gate";
const MINUTES = 10;

export const adminGateOn = () => (process.env.ADMIN_SECRET ?? "").length >= MIN_LENGTH;

/** Constant-time comparison with ADMIN_SECRET. */
export function isAdminSecret(input: string): boolean {
  const secret = process.env.ADMIN_SECRET ?? "";
  if (secret.length < MIN_LENGTH) return false;
  const a = Buffer.from(input.trim());
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

const key = () => new TextEncoder().encode(`${process.env.JWT_SECRET ?? ""}:admin-gate`);

/** Proof that the secret was entered, valid for 10 minutes (so the secret isn't sent again). */
export const gatePass = () =>
  new SignJWT({}).setProtectedHeader({ alg: "HS256" }).setAudience(AUDIENCE).setIssuedAt().setExpirationTime(`${MINUTES}m`).sign(key());

export async function validGatePass(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, key(), { audience: AUDIENCE, algorithms: ["HS256"] });
    return true;
  } catch {
    return false;
  }
}
