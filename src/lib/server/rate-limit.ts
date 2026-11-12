import "server-only";
import { MongoServerError } from "mongodb";
import { headers } from "next/headers";
import { getDb } from "./db";

/**
 * Rate limits stored in MongoDB (`rate_limits`, a TTL collection), so they hold
 * across tabs, restarts and several server instances.
 *
 * One document per rule and key: `{_id: "login-email:a@b.com", n, expiresAt}`.
 * The window starts at the first attempt and lasts `windowSec`; once it has
 * passed, the next attempt starts a new one. So a lockout always lasts until
 * the window that the attempts used up ends, never a few seconds by accident.
 * Each count is one atomic update; MongoDB's TTL monitor deletes old documents.
 */
export type Rule = { name: string; max: number; windowSec: number };

export const RULES = {
  /** Failed logins for one email: password guessing on an account. */
  loginEmail: { name: "login-email", max: 5, windowSec: 15 * 60 },
  /** Failed logins from one IP: guessing across many accounts. */
  loginIp: { name: "login-ip", max: 20, windowSec: 15 * 60 },
  /** Things typed into the login email box that aren't emails (guessing the admin secret). */
  adminGateIp: { name: "admin-gate-ip", max: 10, windowSec: 60 * 60 },
  /** Accounts created from one IP. */
  registerIp: { name: "register-ip", max: 5, windowSec: 60 * 60 },
  /** Reset emails for one address (silently capped, so it can't be used to spam an inbox). */
  resetEmail: { name: "reset-email", max: 3, windowSec: 60 * 60 },
  resetIp: { name: "reset-ip", max: 10, windowSec: 60 * 60 },
  /** Invalid or used reset links tried from one IP. */
  resetTokenIp: { name: "reset-token-ip", max: 10, windowSec: 60 * 60 },
  /** Orders placed by one account. */
  orderUser: { name: "order-user", max: 5, windowSec: 60 * 60 },
  /** Wrong coupon codes typed by one account (guessing link-only codes). */
  couponUser: { name: "coupon-user", max: 10, windowSec: 15 * 60 },
  /** "Notify me" requests by one account. */
  stockAlertUser: { name: "stock-alert-user", max: 20, windowSec: 24 * 60 * 60 },
  /** Reviews written or edited by one account. */
  reviewUser: { name: "review-user", max: 20, windowSec: 60 * 60 },
} satisfies Record<string, Rule>;

/** Orders still waiting for the store to confirm them, per account. */
export const MAX_PENDING_ORDERS = 3;

type LimitDoc = { _id: string; n: number; expiresAt: Date };

let indexed: Promise<unknown> | undefined;
async function col() {
  const c = (await getDb()).collection<LimitDoc>("rate_limits");
  indexed ??= c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }).catch(() => (indexed = undefined));
  await indexed;
  return c;
}

const idOf = (rule: Rule, key: string) => `${rule.name}:${key.toLowerCase().slice(0, 200)}`;
const secondsUntil = (d: Date, now: number) => Math.max(1, Math.ceil((d.getTime() - now) / 1000));

/**
 * Counts one attempt. Returns the seconds to wait when this attempt goes over
 * the limit, or null when it is allowed. An empty key (e.g. no IP) is never limited.
 */
export async function hit(rule: Rule, key: string | null): Promise<number | null> {
  if (!key) return null;
  const now = Date.now();
  const nowDate = new Date(now);
  const fresh = new Date(now + rule.windowSec * 1000);
  const live = { $gt: ["$expiresAt", nowDate] };
  const c = await col();
  // Inside the current window: n + 1. No window yet, or it has passed: start one at n = 1.
  const inc = () =>
    c.findOneAndUpdate(
      { _id: idOf(rule, key) },
      [{ $set: { n: { $cond: [live, { $add: ["$n", 1] }, 1] }, expiresAt: { $cond: [live, "$expiresAt", fresh] } } }],
      { upsert: true, returnDocument: "after" },
    );
  let doc;
  try {
    doc = await inc();
  } catch (e) {
    // Two first attempts at the same moment: one upsert wins, the other retries as an update.
    if (e instanceof MongoServerError && e.code === 11000) doc = await inc();
    else throw e;
  }
  return doc && doc.n > rule.max ? secondsUntil(doc.expiresAt, now) : null;
}

/** Seconds to wait if this key has already used up the rule (without counting a new attempt), else null. */
export async function blocked(rule: Rule, key: string | null): Promise<number | null> {
  if (!key) return null;
  const now = Date.now();
  const doc = await (await col()).findOne({ _id: idOf(rule, key), expiresAt: { $gt: new Date(now) } });
  return doc && doc.n >= rule.max ? secondsUntil(doc.expiresAt, now) : null;
}

/** The first of several limits that is reached (seconds to wait), or null. */
export async function firstBlocked(...checks: [Rule, string | null][]): Promise<number | null> {
  const waits = await Promise.all(checks.map(([r, k]) => blocked(r, k)));
  return waits.find((w) => w !== null) ?? null;
}

/**
 * The visitor's IP, for per-IP limits. `x-real-ip` (set by nginx, Vercel and
 * most hosts), otherwise the last `x-forwarded-for` entry (the one added by the
 * nearest proxy, or by Next.js from the socket). Without a proxy in front a
 * visitor can fake these headers, so per-IP limits are only a backup: the
 * per-email and per-account limits are the ones that hold.
 */
export async function clientIp(): Promise<string | null> {
  const h = await headers();
  const real = h.get("x-real-ip")?.trim();
  const forwarded = h.get("x-forwarded-for")?.split(",").map((s) => s.trim()).filter(Boolean).at(-1);
  const ip = (real || forwarded || "").slice(0, 64);
  return ip || null;
}

/*
 * Actions answer a reached limit with `retryAfter` (seconds), not a message:
 * the form's button locks itself and counts down (lib/use-cooldown.ts).
 */
