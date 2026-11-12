import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { getDb } from "./db";
import { sendMail } from "./mail";

/**
 * Sign-up with a one-time code. No account exists until the code is entered:
 * the details wait in `pending_registrations` (keyed by email, deleted by TTL
 * after an hour), with only a hash of the code and of the password.
 */
export const OTP = {
  digits: 6,
  /** How long one code works. */
  codeMinutes: 10,
  /** Wrong tries per code; after that a new code is needed. */
  maxAttempts: 5,
  /** Wait between sends. */
  resendSeconds: 60,
  /** Codes per sign-up (the record lives an hour, so: per hour). */
  maxSends: 5,
  recordMinutes: 60,
} as const;

type PendingDoc = {
  _id: string; // email, lower-case
  name: string;
  passwordHash: string;
  codeHash: string;
  attempts: number;
  sends: number;
  lastSentAt: Date;
  codeExpiresAt: Date;
  /** The record itself (TTL). */
  expiresAt: Date;
};

let indexed: Promise<unknown> | undefined;
async function col() {
  const c = (await getDb()).collection<PendingDoc>("pending_registrations");
  indexed ??= c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => (indexed = undefined));
  await indexed;
  return c;
}

/** The code is never stored: only a hash, peppered with the server secret. */
const hashCode = (email: string, code: string) =>
  createHash("sha256").update(`${email}:${code}:${process.env.JWT_SECRET ?? ""}`).digest("hex");

const newCode = () => String(randomInt(0, 10 ** OTP.digits)).padStart(OTP.digits, "0");

async function sendCode(email: string, name: string, code: string) {
  return sendMail(
    email,
    `${code} is your Ŕose Atelier code`,
    "Confirm your email",
    [
      `Hello ${name.split(" ")[0]}, enter this code on the sign-up page to finish creating your account.`,
      `It works for ${OTP.codeMinutes} minutes. If you didn't try to create an account, you can ignore this email.`,
    ],
    undefined,
    code,
  );
}

const secondsUntil = (d: Date, now: number) => Math.max(1, Math.ceil((d.getTime() - now) / 1000));

export type StartResult = { ok: true } | { ok: false; error: string } | { ok: false; retryAfter: number };

/**
 * Saves the sign-up and emails a code. Submitting the form again within a
 * minute keeps the code already sent (and its countdown) instead of sending another.
 */
export async function startRegistration(email: string, name: string, passwordHash: string): Promise<StartResult> {
  const c = await col();
  const now = Date.now();
  const existing = await c.findOne({ _id: email, expiresAt: { $gt: new Date(now) } });
  if (existing) {
    await c.updateOne({ _id: email }, { $set: { name, passwordHash } });
    if (now - existing.lastSentAt.getTime() < OTP.resendSeconds * 1000) return { ok: true };
    if (existing.sends >= OTP.maxSends) return { ok: false, retryAfter: secondsUntil(existing.expiresAt, now) };
  }
  const code = newCode();
  const doc: PendingDoc = {
    _id: email,
    name,
    passwordHash,
    codeHash: hashCode(email, code),
    attempts: 0,
    sends: (existing?.sends ?? 0) + 1,
    lastSentAt: new Date(now),
    codeExpiresAt: new Date(now + OTP.codeMinutes * 60_000),
    expiresAt: existing?.expiresAt ?? new Date(now + OTP.recordMinutes * 60_000),
  };
  await c.replaceOne({ _id: email }, doc, { upsert: true });
  if (!(await sendCode(email, name, code))) {
    await c.deleteOne({ _id: email });
    return { ok: false, error: "We couldn't send an email to this address. Please check it and try again." };
  }
  return { ok: true };
}

/** A new code for a sign-up in progress (the Resend button). */
export async function resendCode(email: string): Promise<{ ok: true } | { ok: false; error: string } | { ok: false; retryAfter: number }> {
  const c = await col();
  const now = Date.now();
  const doc = await c.findOne({ _id: email, expiresAt: { $gt: new Date(now) } });
  if (!doc) return { ok: false, error: "This sign-up has expired. Please fill in the form again." };
  const since = now - doc.lastSentAt.getTime();
  if (since < OTP.resendSeconds * 1000) return { ok: false, retryAfter: Math.ceil((OTP.resendSeconds * 1000 - since) / 1000) };
  if (doc.sends >= OTP.maxSends) return { ok: false, retryAfter: secondsUntil(doc.expiresAt, now) };
  const code = newCode();
  await c.updateOne(
    { _id: email },
    {
      $set: { codeHash: hashCode(email, code), attempts: 0, lastSentAt: new Date(now), codeExpiresAt: new Date(now + OTP.codeMinutes * 60_000) },
      $inc: { sends: 1 },
    },
  );
  if (!(await sendCode(email, doc.name, code))) return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
  return { ok: true };
}

export type CheckResult =
  | { ok: true; name: string; passwordHash: string }
  | { ok: false; error: string; expired?: boolean; attemptsLeft?: number };

/** Checks a code. On success the sign-up is used up (one code, one account). */
export async function checkCode(email: string, code: string): Promise<CheckResult> {
  const c = await col();
  const now = new Date();
  const doc = await c.findOne({ _id: email, expiresAt: { $gt: now } });
  if (!doc) return { ok: false, expired: true, error: "This sign-up has expired. Please fill in the form again." };
  if (doc.attempts >= OTP.maxAttempts) return { ok: false, error: "Too many wrong codes. Tap Resend code to get a new one.", attemptsLeft: 0 };
  if (doc.codeExpiresAt <= now) return { ok: false, error: "This code has expired. Tap Resend code to get a new one." };

  const given = Buffer.from(hashCode(email, code));
  const right = given.length === doc.codeHash.length && timingSafeEqual(given, Buffer.from(doc.codeHash));
  if (!right) {
    const after = await c.findOneAndUpdate({ _id: email }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
    const left = Math.max(0, OTP.maxAttempts - (after?.attempts ?? OTP.maxAttempts));
    return {
      ok: false,
      attemptsLeft: left,
      error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Tap Resend code to get a new one.",
    };
  }
  // Delete only this exact code's record, so two tabs can't both use it.
  const used = await c.findOneAndDelete({ _id: email, codeHash: doc.codeHash });
  if (!used) return { ok: false, error: "This code was just used. Please log in." };
  return { ok: true, name: used.name, passwordHash: used.passwordHash };
}
