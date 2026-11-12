import "server-only";
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { sendMail } from "./mail";

/**
 * Cash on Delivery orders from new customers are confirmed with an emailed
 * 6-digit code before they are placed (option B: customers with a delivered
 * order skip it). One pending confirmation per account, in `order_codes`:
 * the checkout details, a fingerprint of the exact order and a hash of the
 * code. Nothing is reserved until the code is entered.
 */
export const ORDER_CODE = { digits: 6, codeMinutes: 10, maxAttempts: 5, resendSeconds: 60, maxSends: 5, recordMinutes: 60 } as const;

/** What the checkout form said (validated), kept until the code is entered. */
export type CheckoutData = {
  name: string;
  email: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  country: string;
  delivery: string;
  paymentMethod: string;
  walletNumber: string;
};

type CodeDoc = {
  _id: ObjectId; // the account
  email: string;
  total: number;
  data: CheckoutData;
  /** Hash of the priced order: items, prices, coupon, delivery, address. */
  fingerprint: string;
  codeHash: string;
  attempts: number;
  sends: number;
  lastSentAt: Date;
  codeExpiresAt: Date;
  expiresAt: Date;
};

let indexed: Promise<unknown> | undefined;
async function col() {
  const c = (await getDb()).collection<CodeDoc>("order_codes");
  indexed ??= c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => (indexed = undefined));
  await indexed;
  return c;
}

const hashCode = (userId: string, code: string) => createHash("sha256").update(`order:${userId}:${code}:${process.env.JWT_SECRET ?? ""}`).digest("hex");
const newCode = () => String(randomInt(0, 10 ** ORDER_CODE.digits)).padStart(ORDER_CODE.digits, "0");
const secondsUntil = (d: Date, now: number) => Math.max(1, Math.ceil((d.getTime() - now) / 1000));
const pkr = (n: number) => `PKR ${n.toLocaleString("en-US")}`;

/** A stable hash of everything that makes the order what it is. */
export function orderFingerprint(parts: unknown): string {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

/** Does this account still need a code for Cash on Delivery? Not after its first delivered order. */
export async function needsOrderCode(userId: string): Promise<boolean> {
  const delivered = await (await getDb()).collection("orders").countDocuments({ userId: new ObjectId(userId), status: "delivered" }, { limit: 1 });
  return delivered === 0;
}

async function sendCode(email: string, name: string, code: string, total: number) {
  return sendMail(
    email,
    `${code} is your code to confirm your order — Ŕose Atelier`,
    "Confirm your order",
    [
      `Hello ${name.split(" ")[0]}, enter this code on the checkout page to place your Cash on Delivery order of ${pkr(total)}.`,
      `It works for ${ORDER_CODE.codeMinutes} minutes. If you didn't try to place an order, you can ignore this email: nothing will be ordered.`,
    ],
    undefined,
    code,
  );
}

export type StartResult = { ok: true } | { ok: false; error: string } | { ok: false; retryAfter: number };

/**
 * Saves the checkout and emails a code. Pressing Place Order again within a
 * minute keeps the code already sent, unless the order itself changed.
 */
export async function startOrderCode(userId: string, data: CheckoutData, fingerprint: string, total: number): Promise<StartResult> {
  const c = await col();
  const now = Date.now();
  const _id = new ObjectId(userId);
  const existing = await c.findOne({ _id, expiresAt: { $gt: new Date(now) } });
  const sameOrder = existing?.fingerprint === fingerprint && existing.email === data.email;
  if (existing && sameOrder && now - existing.lastSentAt.getTime() < ORDER_CODE.resendSeconds * 1000) return { ok: true };
  if (existing && existing.sends >= ORDER_CODE.maxSends) return { ok: false, retryAfter: secondsUntil(existing.expiresAt, now) };
  const code = newCode();
  const doc: CodeDoc = {
    _id,
    email: data.email,
    total,
    data,
    fingerprint,
    codeHash: hashCode(userId, code),
    attempts: 0,
    sends: (existing?.sends ?? 0) + 1,
    lastSentAt: new Date(now),
    codeExpiresAt: new Date(now + ORDER_CODE.codeMinutes * 60_000),
    expiresAt: existing?.expiresAt ?? new Date(now + ORDER_CODE.recordMinutes * 60_000),
  };
  await c.replaceOne({ _id }, doc, { upsert: true });
  if (!(await sendCode(data.email, data.name, code, total))) {
    await c.deleteOne({ _id });
    return { ok: false, error: "We couldn't send the confirmation email. Please check the email address on the form and try again." };
  }
  return { ok: true };
}

/** "Resend code" in the checkout dialog. */
export async function resendOrderCode(userId: string): Promise<{ ok: true } | { ok: false; error: string } | { ok: false; retryAfter: number }> {
  const c = await col();
  const now = Date.now();
  const _id = new ObjectId(userId);
  const doc = await c.findOne({ _id, expiresAt: { $gt: new Date(now) } });
  if (!doc) return { ok: false, error: "This confirmation has expired. Please press Place Order again." };
  const since = now - doc.lastSentAt.getTime();
  if (since < ORDER_CODE.resendSeconds * 1000) return { ok: false, retryAfter: Math.ceil((ORDER_CODE.resendSeconds * 1000 - since) / 1000) };
  if (doc.sends >= ORDER_CODE.maxSends) return { ok: false, retryAfter: secondsUntil(doc.expiresAt, now) };
  const code = newCode();
  await c.updateOne(
    { _id },
    { $set: { codeHash: hashCode(userId, code), attempts: 0, lastSentAt: new Date(now), codeExpiresAt: new Date(now + ORDER_CODE.codeMinutes * 60_000) }, $inc: { sends: 1 } },
  );
  if (!(await sendCode(doc.email, doc.data.name, code, doc.total))) return { ok: false, error: "We couldn't send the email. Please try again in a minute." };
  return { ok: true };
}

export type CheckResult =
  | { ok: true; data: CheckoutData; fingerprint: string }
  | { ok: false; error: string; expired?: boolean };

/** Checks the code. A right code uses the confirmation up (one code, one order). */
export async function checkOrderCode(userId: string, code: string): Promise<CheckResult> {
  const c = await col();
  const now = new Date();
  const _id = new ObjectId(userId);
  const doc = await c.findOne({ _id, expiresAt: { $gt: now } });
  if (!doc) return { ok: false, expired: true, error: "This confirmation has expired. Please press Place Order again." };
  if (doc.attempts >= ORDER_CODE.maxAttempts) return { ok: false, error: "Too many wrong codes. Tap Resend code to get a new one." };
  if (doc.codeExpiresAt <= now) return { ok: false, error: "This code has expired. Tap Resend code to get a new one." };
  const given = Buffer.from(hashCode(userId, code));
  const right = given.length === doc.codeHash.length && timingSafeEqual(given, Buffer.from(doc.codeHash));
  if (!right) {
    const after = await c.findOneAndUpdate({ _id }, { $inc: { attempts: 1 } }, { returnDocument: "after" });
    const left = Math.max(0, ORDER_CODE.maxAttempts - (after?.attempts ?? ORDER_CODE.maxAttempts));
    return { ok: false, error: left > 0 ? `That code isn't right. ${left} ${left === 1 ? "try" : "tries"} left.` : "Too many wrong codes. Tap Resend code to get a new one." };
  }
  const used = await c.findOneAndDelete({ _id, codeHash: doc.codeHash });
  if (!used) return { ok: false, error: "This code was just used. Check your orders on your account page." };
  return { ok: true, data: used.data, fingerprint: used.fingerprint };
}
