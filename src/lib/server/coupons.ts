import "server-only";
import { randomInt } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { io } from "next/cache";
import {
  couponConditions,
  couponHeadline,
  dayMonth,
  normaliseCode,
  RANDOM_DEFAULT,
  type CouponTerms,
  type CouponType,
  type OfferSummary,
} from "../coupons";
import { carts } from "./carts";
import { getDb } from "./db";

export type CouponDoc = {
  _id: ObjectId;
  code: string;
  type: CouponType;
  value: number;
  maxDiscount: number | null;
  minOrder: number | null;
  fullPriceOnly: boolean;
  startsAt: Date | null;
  endsAt: Date | null;
  /** Total uses allowed (null = unlimited). For a surprise campaign: cards it may hand out. */
  maxUses: number | null;
  perCustomer: number;
  active: boolean;
  /** Shown to customers in "My Coupons" and the bag/checkout strip. Off = shared by link only. */
  public?: boolean;
  /** Orders that used it and were not cancelled. For a surprise campaign: cards handed out. */
  uses: number;
  /** Surprise campaign (`type: "random"`): percent range for each customer's card. */
  minPercent?: number;
  maxPercent?: number;
  /** A customer's own card from a surprise campaign: usable only by `ownerId`. */
  campaignId?: ObjectId;
  ownerId?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * One document per (coupon, customer): how many of their live orders used it,
 * and when they scratched its card (the discount stays hidden until then).
 */
type RedemptionDoc = { _id: string; couponId: ObjectId; userId: ObjectId; n: number; revealedAt?: Date };

let indexed: Promise<unknown> | undefined;
export async function coupons() {
  const db = await getDb();
  const col = db.collection<CouponDoc>("coupons");
  indexed ??= Promise.all([
    col.createIndex({ code: 1 }, { unique: true }),
    // At most one surprise card per customer per campaign, even if they open it twice at once.
    col.createIndex({ campaignId: 1, ownerId: 1 }, { unique: true, partialFilterExpression: { campaignId: { $exists: true } } }),
  ]);
  await indexed;
  return col;
}
const redemptions = async () => (await getDb()).collection<RedemptionDoc>("coupon_redemptions");
const rid = (couponId: ObjectId, userId: string) => `${couponId.toHexString()}:${userId}`;

export const toTerms = (c: CouponDoc): CouponTerms => ({
  code: c.code,
  type: c.type,
  value: c.value,
  maxDiscount: c.maxDiscount,
  minOrder: c.minOrder,
  fullPriceOnly: c.fullPriceOnly,
  startsAt: c.startsAt ? c.startsAt.toISOString() : null,
  endsAt: c.endsAt ? c.endsAt.toISOString() : null,
  perCustomer: c.perCustomer,
  range: c.type === "random" ? [c.minPercent ?? RANDOM_DEFAULT[0], c.maxPercent ?? RANDOM_DEFAULT[1]] : null,
});

export async function getCouponByCode(code: string) {
  return (await coupons()).findOne({ code: normaliseCode(code) });
}

export type CouponState = "active" | "paused" | "scheduled" | "expired" | "used_up";

/*
 * Coupon checks read the current time (start/end dates). With Cache Components,
 * pages that read cookies can still be prerendered (e.g. for prefetching), so
 * every async entry point that ends up in couponState() awaits io() first: it
 * stops prerendering there and resolves at once in requests and server actions.
 * (io(), not connection(): connection() would also block instant navigations.)
 */

export function couponState(c: CouponDoc, now = new Date()): CouponState {
  if (!c.active) return "paused";
  if (c.endsAt && now > c.endsAt) return "expired";
  if (c.startsAt && now < c.startsAt) return "scheduled";
  if (c.maxUses !== null && c.uses >= c.maxUses) return "used_up";
  return "active";
}

const stateReason: Record<Exclude<CouponState, "active">, string> = {
  paused: "This code is not valid.",
  expired: "This code has expired.",
  scheduled: "This code is not active yet.",
  used_up: "This code has been fully used.",
};

/** Why this customer can't use the coupon right now, in plain words (or null if they can). */
export async function unavailableReason(c: CouponDoc | null, userId: string | null): Promise<string | null> {
  await io();
  if (!c) return "This code is not valid.";
  if (c.type === "random") return "Open your surprise card to get your own code.";
  // A surprise card belongs to one customer, and stops when its campaign is paused or ends.
  if (c.ownerId && (!userId || c.ownerId.toHexString() !== userId)) return "This code is not valid.";
  if (c.campaignId) {
    const campaign = await (await coupons()).findOne({ _id: c.campaignId });
    if (!campaign) return "This code is not valid.";
    const s = couponState(campaign);
    if (s === "paused" || s === "expired" || s === "scheduled") return stateReason[s];
  }
  const state = couponState(c);
  if (state !== "active") return state === "used_up" && c.ownerId ? "You have already used this code." : stateReason[state];
  if (userId) {
    const mine = await (await redemptions()).findOne({ _id: rid(c._id, userId) });
    if (mine && mine.n >= c.perCustomer) return "You have already used this code.";
  }
  return null;
}

/**
 * Takes one use for this customer, atomically: the total limit and the
 * per-customer limit can't be passed even by two orders at the same moment.
 */
export async function claimCoupon(c: CouponDoc, userId: string): Promise<string | null> {
  const col = await coupons();
  const took = await col.updateOne(
    { _id: c._id, active: true, ...(c.maxUses !== null ? { uses: { $lt: c.maxUses } } : {}) },
    { $inc: { uses: 1 } },
  );
  if (took.modifiedCount === 0) return "This code has just been fully used.";
  try {
    await (await redemptions()).updateOne(
      { _id: rid(c._id, userId), n: { $lt: c.perCustomer } },
      { $inc: { n: 1 }, $setOnInsert: { couponId: c._id, userId: new ObjectId(userId) } },
      { upsert: true },
    );
    return null;
  } catch (e) {
    await col.updateOne({ _id: c._id }, { $inc: { uses: -1 } });
    if (e instanceof MongoServerError && e.code === 11000) return "You have already used this code.";
    throw e;
  }
}

/** Gives a use back (order failed or was cancelled). */
export async function releaseCoupon(code: string, userId: string | null) {
  const col = await coupons();
  const c = await col.findOne({ code });
  if (!c) return;
  await col.updateOne({ _id: c._id, uses: { $gt: 0 } }, { $inc: { uses: -1 } });
  if (userId) await (await redemptions()).updateOne({ _id: rid(c._id, userId), n: { $gt: 0 } }, { $inc: { n: -1 } });
}

/* ---------- Surprise cards ---------- */

const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"; // no 0/O/1/I
const newCardCode = () => `ROSE-${Array.from({ length: 6 }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join("")}`;

/**
 * This customer's own card from a surprise campaign. The first visit creates
 * it with a random code and a random percent in the campaign's range; later
 * visits return the same card (never re-rolled).
 */
export async function cardFor(campaign: CouponDoc, userId: string): Promise<{ card: CouponDoc } | { error: string }> {
  await io();
  const col = await coupons();
  const owner = new ObjectId(userId);
  const existing = await col.findOne({ campaignId: campaign._id, ownerId: owner });
  if (existing) return { card: existing };

  const s = couponState(campaign);
  if (s === "used_up") return { error: "All the surprise cards have been given out." };
  if (s !== "active") return { error: stateReason[s] };

  // One card from the campaign's allowance (atomic, like claimCoupon).
  const took = await col.updateOne(
    { _id: campaign._id, active: true, ...(campaign.maxUses !== null ? { uses: { $lt: campaign.maxUses } } : {}) },
    { $inc: { uses: 1 } },
  );
  if (took.modifiedCount === 0) return { error: "All the surprise cards have been given out." };

  const lo = campaign.minPercent ?? RANDOM_DEFAULT[0];
  const hi = Math.max(lo, campaign.maxPercent ?? RANDOM_DEFAULT[1]);
  const now = new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    const card: CouponDoc = {
      _id: new ObjectId(),
      code: newCardCode(),
      type: "percent",
      value: randomInt(lo, hi + 1),
      maxDiscount: campaign.maxDiscount,
      minOrder: campaign.minOrder,
      fullPriceOnly: campaign.fullPriceOnly,
      startsAt: campaign.startsAt,
      endsAt: campaign.endsAt,
      maxUses: 1,
      perCustomer: 1,
      active: true,
      public: false,
      uses: 0,
      campaignId: campaign._id,
      ownerId: owner,
      createdAt: now,
      updatedAt: now,
    };
    try {
      await col.insertOne(card);
      return { card };
    } catch (e) {
      if (!(e instanceof MongoServerError && e.code === 11000)) throw e;
      // Opened twice at the same moment: keep the card the other request made.
      const raced = await col.findOne({ campaignId: campaign._id, ownerId: owner });
      if (raced) {
        await col.updateOne({ _id: campaign._id, uses: { $gt: 0 } }, { $inc: { uses: -1 } });
        return { card: raced };
      }
      // Otherwise the random code clashed: try another.
    }
  }
  await col.updateOne({ _id: campaign._id, uses: { $gt: 0 } }, { $inc: { uses: -1 } });
  throw new Error("Could not create a surprise card code");
}

/** Remembers that this customer scratched the card (their tickets then show the discount). */
export async function markRevealed(c: CouponDoc, userId: string) {
  await (await redemptions()).updateOne(
    { _id: rid(c._id, userId) },
    { $set: { revealedAt: new Date() }, $setOnInsert: { couponId: c._id, userId: new ObjectId(userId), n: 0 } },
    { upsert: true },
  );
}

export async function isRevealed(c: CouponDoc, userId: string) {
  return !!(await (await redemptions()).findOne({ _id: rid(c._id, userId), revealedAt: { $exists: true } }));
}

/* ---------- Admin reads (callers must requireAdmin first) ---------- */

export type CouponRow = Omit<CouponDoc, "_id" | "startsAt" | "endsAt" | "createdAt" | "updatedAt" | "campaignId" | "ownerId"> & {
  id: string;
  startsAt: string | null;
  endsAt: string | null;
  createdAt: string;
  state: CouponState;
  /** From orders that used it (or, for a campaign, any of its cards) and weren't cancelled. */
  orders: number;
  discountGiven: number;
  sales: number;
  /** Surprise campaigns: cards handed out and the average percent they got. */
  cards?: { given: number; avgPercent: number | null };
};

type Stats = { orders: number; discount: number; sales: number };

export async function listCoupons(): Promise<CouponRow[]> {
  await io();
  const db = await getDb();
  const col = await coupons();
  const [docs, cards, stats] = await Promise.all([
    col.find({ campaignId: { $exists: false } }).sort({ createdAt: -1 }).toArray(),
    col.find({ campaignId: { $exists: true } }, { projection: { code: 1, campaignId: 1, value: 1 } }).toArray(),
    db
      .collection("orders")
      .aggregate<{ _id: string } & Stats>([
        { $match: { "coupon.code": { $exists: true }, status: { $ne: "cancelled" } } },
        { $group: { _id: "$coupon.code", orders: { $sum: 1 }, discount: { $sum: "$coupon.discount" }, sales: { $sum: "$total" } } },
      ])
      .toArray(),
  ]);
  const byCode = new Map(stats.map((s) => [s._id, s]));
  // A campaign's numbers are the sum over the customers' cards.
  const campaign = new Map<string, Stats & { given: number; pct: number }>();
  for (const c of cards) {
    const k = c.campaignId!.toHexString();
    const agg = campaign.get(k) ?? { orders: 0, discount: 0, sales: 0, given: 0, pct: 0 };
    const s = byCode.get(c.code);
    agg.given++;
    agg.pct += c.value;
    if (s) {
      agg.orders += s.orders;
      agg.discount += s.discount;
      agg.sales += s.sales;
    }
    campaign.set(k, agg);
  }
  return docs.map((c) => {
    if (c.type !== "random") return toRow(c, byCode.get(c.code));
    const a = campaign.get(c._id.toHexString());
    return { ...toRow(c, a), cards: { given: a?.given ?? 0, avgPercent: a?.given ? Math.round(a.pct / a.given) : null } };
  });
}

export async function getCouponRow(id: string): Promise<CouponRow | null> {
  await io();
  if (!ObjectId.isValid(id)) return null;
  const c = await (await coupons()).findOne({ _id: new ObjectId(id), campaignId: { $exists: false } });
  return c ? toRow(c) : null;
}

function toRow(c: CouponDoc, s?: Stats): CouponRow {
  const { _id, startsAt, endsAt, createdAt, updatedAt, campaignId, ownerId, ...rest } = c;
  void updatedAt;
  void campaignId;
  void ownerId;
  return {
    ...rest,
    id: _id.toHexString(),
    startsAt: startsAt ? startsAt.toISOString() : null,
    endsAt: endsAt ? endsAt.toISOString() : null,
    createdAt: createdAt.toISOString(),
    public: c.public ?? false,
    state: couponState(c),
    orders: s?.orders ?? 0,
    discountGiven: s?.discount ?? 0,
    sales: s?.sales ?? 0,
  };
}

/**
 * The coupon saved on a customer's bag, checked again now. A code that has
 * stopped working is removed, with the reason to show at checkout.
 */
export async function appliedCouponFor(userId: string): Promise<{ terms: CouponTerms | null; dropped?: string }> {
  const col = await carts();
  const cart = await col.findOne({ _id: new ObjectId(userId) }, { projection: { coupon: 1 } });
  if (!cart?.coupon) return { terms: null };
  const c = await getCouponByCode(cart.coupon);
  const reason = await unavailableReason(c, userId);
  if (reason || !c) {
    await col.updateOne({ _id: cart._id }, { $unset: { coupon: "" } });
    return { terms: null, dropped: `Coupon ${cart.coupon} was removed: ${reason}` };
  }
  return { terms: toTerms(c) };
}

export type { OfferSummary } from "../coupons";

/**
 * What this customer can use now, ending soonest first: public coupons, their
 * own surprise cards, and public surprise campaigns they haven't opened yet.
 * The discount is only included once they have scratched that card.
 */
export async function publicCouponsFor(userId: string): Promise<OfferSummary[]> {
  await io();
  const col = await coupons();
  const owner = new ObjectId(userId);
  const [shared, mine] = await Promise.all([
    col.find({ active: true, public: true, campaignId: { $exists: false } }).toArray(),
    col.find({ ownerId: owner }).toArray(),
  ]);
  const opened = new Set(mine.map((c) => c.campaignId!.toHexString()));
  const out: { doc: CouponDoc; summary: OfferSummary }[] = [];
  for (const c of [...mine, ...shared]) {
    if (c.type === "random") {
      // A campaign shows until the customer opens it; then their own card shows instead.
      if (opened.has(c._id.toHexString()) || couponState(c) !== "active") continue;
    } else if (await unavailableReason(c, userId)) continue;
    const t = toTerms(c);
    const revealed = c.type !== "random" && (await isRevealed(c, userId));
    out.push({
      doc: c,
      summary: {
        code: c.code,
        headline: revealed ? couponHeadline(t) : null,
        conditions: couponConditions(t).join(" · "),
        validUntil: t.endsAt ? dayMonth(t.endsAt) : null,
        surprise: c.type === "random" || !!c.campaignId,
      },
    });
  }
  return out.sort((a, b) => (a.doc.endsAt?.getTime() ?? Infinity) - (b.doc.endsAt?.getTime() ?? Infinity)).map((o) => o.summary);
}

/* ---------- Order tracking (admin) ---------- */

/** Surprise campaign code for each personal card code (orders placed before orders stored it). */
export async function campaignOfCards(codes: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (codes.length === 0) return out;
  const col = await coupons();
  const cards = await col.find({ code: { $in: codes }, campaignId: { $exists: true } }, { projection: { code: 1, campaignId: 1 } }).toArray();
  const ids = [...new Set(cards.map((c) => c.campaignId!.toHexString()))].map((h) => new ObjectId(h));
  const camps = new Map((await col.find({ _id: { $in: ids } }, { projection: { code: 1 } }).toArray()).map((c) => [c._id.toHexString(), c.code]));
  for (const c of cards) {
    const camp = camps.get(c.campaignId!.toHexString());
    if (camp) out.set(c.code, camp);
  }
  return out;
}

/**
 * Codes an order filter can match: the code itself and, for a surprise
 * campaign, every card it gave out (orders use the cards' own codes).
 */
export async function orderCodesFor(code: string): Promise<string[]> {
  const col = await coupons();
  const c = await col.findOne({ code });
  if (c?.type !== "random") return [code];
  const cards = await col.find({ campaignId: c._id }, { projection: { code: 1 } }).toArray();
  return [code, ...cards.map((x) => x.code)];
}

/** Choices for the Orders page "Coupon" filter: current coupons and campaigns, plus codes only old orders still mention. */
export async function couponFilterOptions(): Promise<string[]> {
  const db = await getDb();
  const [current, used, usedCampaigns] = await Promise.all([
    (await coupons()).find({ campaignId: { $exists: false } }, { projection: { code: 1 } }).toArray(),
    db.collection("orders").distinct("coupon.code", { "coupon.campaign": { $exists: false } }) as Promise<string[]>,
    db.collection("orders").distinct("coupon.campaign") as Promise<string[]>,
  ]);
  const cards = new Set((await (await coupons()).find({ campaignId: { $exists: true } }, { projection: { code: 1 } }).toArray()).map((c) => c.code));
  const codes = new Set<string>([...current.map((c) => c.code), ...usedCampaigns.filter(Boolean)]);
  for (const c of used) if (c && !cards.has(c)) codes.add(c);
  return [...codes].sort();
}
