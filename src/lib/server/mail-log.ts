import "server-only";
import { getDb } from "./db";

/**
 * A record of every email the store tries to send, for the admin "Emails"
 * page (/admin/emails). `sendMail` writes one row per attempt; rows are kept
 * for about a year (TTL). Recording never throws: a full log must not stop an email.
 */
export const MAIL_KINDS = {
  signup_code: "Sign-up code",
  shipped: "Order on its way",
  password_reset: "Password reset",
  back_in_stock: "Back in stock",
} as const;
export type MailKind = keyof typeof MAIL_KINDS;
export const isMailKind = (v: unknown): v is MailKind => typeof v === "string" && v in MAIL_KINDS;

/** Brevo's free plan sends this many emails a day. */
export const DAILY_LIMIT = 300;
const KEEP_DAYS = 400;
const DAY = 86_400_000;
/** Pakistan is UTC+5 all year (no daylight saving). */
const PKT = 5 * 3_600_000;
const TZ = "Asia/Karachi";

export type MailLogDoc = {
  kind: MailKind;
  to: string;
  subject: string;
  ok: boolean;
  error?: string;
  at: Date;
  expiresAt: Date;
};

let indexed: Promise<unknown> | undefined;
async function col() {
  const c = (await getDb()).collection<MailLogDoc>("mail_log");
  indexed ??= Promise.all([
    c.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    c.createIndex({ at: -1 }),
    c.createIndex({ kind: 1, at: -1 }),
  ]).catch(() => (indexed = undefined));
  await indexed;
  return c;
}

export async function recordMail(kind: MailKind, to: string, subject: string, ok: boolean, error?: string) {
  try {
    const at = new Date();
    await (await col()).insertOne({
      kind,
      to: to.trim().toLowerCase(),
      // Sign-up codes are in their subject ("123456 is your … code"): never keep them.
      subject: kind === "signup_code" ? subject.replace(/\b\d{6}\b/g, "••••••") : subject,
      ok,
      ...(error ? { error: error.slice(0, 300) } : {}),
      at,
      expiresAt: new Date(at.getTime() + KEEP_DAYS * DAY),
    });
  } catch (e) {
    console.error("Could not record an email", e);
  }
}

/** Start of the Pakistan calendar day `daysAgo` days before `now`. */
const pktDayStart = (now: number, daysAgo = 0) => Math.floor((now + PKT) / DAY) * DAY - PKT - daysAgo * DAY;

export type MailStats = {
  today: { sent: number; failed: number };
  /** Sent in the last 7 / 30 days (today included) and the same-length period before. */
  week: { now: number; before: number };
  month: { now: number; before: number };
  failedMonth: { now: number; before: number };
  /** Sent in the last 12 months. */
  year: number;
  byKind: { kind: MailKind; sent: number; failed: number }[];
  daily: { day: string; value: number }[];
};

/** Figures for the Emails page. Callers must requireAdmin and await io() first. */
export async function mailStats(now = Date.now()): Promise<MailStats> {
  const c = await col();
  const since = (days: number) => new Date(pktDayStart(now, days - 1));
  const range = (from: Date, to?: Date) => ({ at: { $gte: from, ...(to ? { $lt: to } : {}) } });
  const count = (filter: object) => c.countDocuments(filter);
  const [todaySent, todayFailed, w, wb, m, mb, fm, fmb, year, kinds, days] = await Promise.all([
    count({ ...range(since(1)), ok: true }),
    count({ ...range(since(1)), ok: false }),
    count({ ...range(since(7)), ok: true }),
    count({ ...range(since(14), since(7)), ok: true }),
    count({ ...range(since(30)), ok: true }),
    count({ ...range(since(60), since(30)), ok: true }),
    count({ ...range(since(30)), ok: false }),
    count({ ...range(since(60), since(30)), ok: false }),
    count({ ...range(new Date(now - 365 * DAY)), ok: true }),
    c
      .aggregate<{ _id: { kind: MailKind; ok: boolean }; n: number }>([
        { $match: range(since(30)) },
        { $group: { _id: { kind: "$kind", ok: "$ok" }, n: { $sum: 1 } } },
      ])
      .toArray(),
    c
      .aggregate<{ _id: string; n: number }>([
        { $match: { ...range(since(30)), ok: true } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$at", timezone: TZ } }, n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const perDay = new Map(days.map((d) => [d._id, d.n]));
  const daily = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(pktDayStart(now, 29 - i) + PKT).toISOString().slice(0, 10);
    return { day, value: perDay.get(day) ?? 0 };
  });
  const byKind = (Object.keys(MAIL_KINDS) as MailKind[]).map((kind) => ({
    kind,
    sent: kinds.find((k) => k._id.kind === kind && k._id.ok)?.n ?? 0,
    failed: kinds.find((k) => k._id.kind === kind && !k._id.ok)?.n ?? 0,
  }));
  return {
    today: { sent: todaySent, failed: todayFailed },
    week: { now: w, before: wb },
    month: { now: m, before: mb },
    failedMonth: { now: fm, before: fmb },
    year,
    byKind,
    daily,
  };
}

type LogFilter = { kind?: MailKind; failed?: boolean };
const toFilter = (f: LogFilter) => ({ ...(f.kind ? { kind: f.kind } : {}), ...(f.failed ? { ok: false } : {}) });

/** How many log rows match (for paging). */
export async function countMail(f: LogFilter) {
  return (await col()).countDocuments(toFilter(f));
}

/** The log, newest first, optionally one kind or only failures. */
export async function listMail(f: LogFilter & { skip: number; limit: number }) {
  const rows = await (await col()).find(toFilter(f)).sort({ at: -1 }).skip(f.skip).limit(Math.max(1, f.limit)).toArray();
  return {
    rows: rows.map((r) => ({ id: r._id.toHexString(), kind: r.kind, to: r.to, subject: r.subject, ok: r.ok, error: r.error ?? null, at: r.at.toISOString() })),
  };
}
