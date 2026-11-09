import "server-only";
import { ObjectId } from "mongodb";
import type { SavedAddress, UserDoc } from "../auth/dal";
import type { Role } from "../auth/jwt";
import type { Order } from "../orders";
import type { AccountCart } from "./carts";
import { carts, hydrateCart } from "./carts";
import { getDb } from "./db";
import { listOrdersForUser } from "./orders";

/*
 * Admin read models for the Users and Listings pages (uncached; callers must
 * requireAdmin first). "Spent" and "sold" always exclude cancelled orders.
 */

const TZ = "Asia/Karachi";
const DAY = 86_400_000;
const live = { status: { $ne: "cancelled" } };

/* ---------------- Users ---------------- */

export type UserInsightRow = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  phone: string | null;
  city: string | null;
  orders: number;
  spent: number;
  lastOrderAt: string | null;
  bagPairs: number;
  wishlist: number;
};

export async function listUserInsights(): Promise<UserInsightRow[]> {
  const db = await getDb();
  const [users, orderRows, cartRows] = await Promise.all([
    db.collection<UserDoc>("users").find({}, { projection: { passwordHash: 0 } }).sort({ createdAt: -1 }).toArray(),
    db
      .collection("orders")
      .aggregate<{ _id: ObjectId; orders: number; spent: number; last: Date }>([
        { $match: { userId: { $ne: null }, ...live } },
        { $group: { _id: "$userId", orders: { $sum: 1 }, spent: { $sum: "$total" }, last: { $max: "$createdAt" } } },
      ])
      .toArray(),
    db
      .collection("carts")
      .aggregate<{ _id: ObjectId; bagPairs: number; wishlist: number }>([
        { $project: { bagPairs: { $sum: "$bag.quantity" }, wishlist: { $size: { $ifNull: ["$wishlist", []] } } } },
      ])
      .toArray(),
  ]);
  const byOrder = new Map(orderRows.map((r) => [r._id.toHexString(), r]));
  const byCart = new Map(cartRows.map((r) => [r._id.toHexString(), r]));
  return users.map((u) => {
    const id = u._id.toHexString();
    const o = byOrder.get(id);
    const c = byCart.get(id);
    return {
      id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt.toISOString(),
      phone: u.savedAddress?.phone || null,
      city: u.savedAddress?.city || null,
      orders: o?.orders ?? 0,
      spent: o?.spent ?? 0,
      lastOrderAt: o?.last ? o.last.toISOString() : null,
      bagPairs: c?.bagPairs ?? 0,
      wishlist: c?.wishlist ?? 0,
    };
  });
}

export type UserReviewRow = {
  id: string;
  productSlug: string;
  rating: number;
  title: string;
  status: string;
  verified: boolean;
  createdAt: string;
};

export type UserDetail = {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  passwordChangedAt: string | null;
  savedAddress: SavedAddress | null;
  orders: Order[];
  cart: AccountCart;
  reviews: UserReviewRow[];
  alerts: { slug: string; size: number; createdAt: string; notified: boolean }[];
};

export async function getUserDetail(id: string): Promise<UserDetail | null> {
  if (!ObjectId.isValid(id)) return null;
  const _id = new ObjectId(id);
  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ _id }, { projection: { passwordHash: 0 } });
  if (!user) return null;
  const [orders, cartDoc, reviews, alerts] = await Promise.all([
    listOrdersForUser(id),
    (await carts()).findOne({ _id }),
    db.collection("reviews").find({ userId: _id }).sort({ createdAt: -1 }).limit(50).toArray(),
    db.collection("stock_alerts").find({ userId: _id }).sort({ createdAt: -1 }).limit(50).toArray(),
  ]);
  return {
    id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
    passwordChangedAt: user.passwordChangedAt ? user.passwordChangedAt.toISOString() : null,
    savedAddress: user.savedAddress ?? null,
    orders,
    cart: await hydrateCart(cartDoc),
    reviews: reviews.map((r) => ({
      id: r._id.toHexString(),
      productSlug: r.productSlug as string,
      rating: r.rating as number,
      title: r.title as string,
      status: r.status as string,
      verified: Boolean(r.verified),
      createdAt: (r.createdAt as Date).toISOString(),
    })),
    alerts: alerts.map((a) => ({
      slug: a.slug as string,
      size: a.size as number,
      createdAt: (a.createdAt as Date).toISOString(),
      notified: Boolean(a.notifiedAt),
    })),
  };
}

/* ---------------- Listings ---------------- */

export type ListingStats = {
  /** Pairs in orders that aren't cancelled (online only; add `otherSales` for the storefront figure). */
  sold: number;
  revenue: number;
  orders: number;
  rating: { average: number; count: number } | null;
  pendingReviews: number;
  wishlisted: number;
  inBags: number;
  waiting: number;
};

const EMPTY_STATS: ListingStats = { sold: 0, revenue: 0, orders: 0, rating: null, pendingReviews: 0, wishlisted: 0, inBags: 0, waiting: 0 };

/** Per-slug figures for every listing, in a handful of aggregate queries. */
export async function listingStatsBySlug(): Promise<Record<string, ListingStats>> {
  const db = await getDb();
  const [sales, ratings, wish, bags, waiting] = await Promise.all([
    db
      .collection("orders")
      .aggregate<{ _id: string; sold: number; revenue: number; orders: number }>([
        { $match: live },
        { $unwind: "$items" },
        {
          $group: {
            _id: { slug: "$items.slug", order: "$_id" },
            sold: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
        { $group: { _id: "$_id.slug", sold: { $sum: "$sold" }, revenue: { $sum: "$revenue" }, orders: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection("reviews")
      .aggregate<{ _id: string; average: number; count: number; pending: number }>([
        {
          $group: {
            _id: "$productSlug",
            average: { $avg: { $cond: [{ $eq: ["$status", "published"] }, "$rating", null] } },
            count: { $sum: { $cond: [{ $eq: ["$status", "published"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          },
        },
      ])
      .toArray(),
    db
      .collection("carts")
      .aggregate<{ _id: string; n: number }>([{ $unwind: "$wishlist" }, { $group: { _id: "$wishlist.slug", n: { $sum: 1 } } }])
      .toArray(),
    db
      .collection("carts")
      .aggregate<{ _id: string; n: number }>([{ $unwind: "$bag" }, { $group: { _id: "$bag.slug", n: { $sum: "$bag.quantity" } } }])
      .toArray(),
    db
      .collection("stock_alerts")
      .aggregate<{ _id: string; n: number }>([{ $match: { notifiedAt: { $exists: false } } }, { $group: { _id: "$slug", n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const out: Record<string, ListingStats> = {};
  const at = (slug: string) => (out[slug] ??= { ...EMPTY_STATS });
  for (const s of sales) Object.assign(at(s._id), { sold: s.sold, revenue: s.revenue, orders: s.orders });
  for (const r of ratings) {
    const x = at(r._id);
    x.pendingReviews = r.pending;
    if (r.count > 0) x.rating = { average: Math.round(r.average * 10) / 10, count: r.count };
  }
  for (const w of wish) at(w._id).wishlisted = w.n;
  for (const b of bags) at(b._id).inBags = b.n;
  for (const w of waiting) at(w._id).waiting = w.n;
  return out;
}

export const statsFor = (all: Record<string, ListingStats>, slug: string) => all[slug] ?? EMPTY_STATS;

export type ListingDetail = {
  stats: ListingStats;
  /** Pairs sold per Pakistan calendar day, last 30 days, oldest first. */
  daily: { day: string; pairs: number }[];
  bySize: { size: number; pairs: number }[];
  waitingBySize: Record<string, number>;
  recentOrders: {
    id: string;
    number: string;
    customer: string;
    size: number;
    quantity: number;
    unitPrice: number;
    status: Order["status"];
    createdAt: string;
  }[];
};

export async function getListingDetail(slug: string): Promise<ListingDetail> {
  const db = await getDb();
  const orders = db.collection("orders");
  const now = Date.now();
  const start = new Date(now - 30 * DAY);
  const [all, daily, bySize, waiting, recent] = await Promise.all([
    listingStatsBySlug(),
    orders
      .aggregate<{ _id: string; pairs: number }>([
        { $match: { createdAt: { $gte: start }, "items.slug": slug, ...live } },
        { $unwind: "$items" },
        { $match: { "items.slug": slug } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            pairs: { $sum: "$items.quantity" },
          },
        },
      ])
      .toArray(),
    orders
      .aggregate<{ _id: number; pairs: number }>([
        { $match: { "items.slug": slug, ...live } },
        { $unwind: "$items" },
        { $match: { "items.slug": slug } },
        { $group: { _id: "$items.size", pairs: { $sum: "$items.quantity" } } },
        { $sort: { _id: 1 } },
      ])
      .toArray(),
    db
      .collection("stock_alerts")
      .aggregate<{ _id: number; n: number }>([
        { $match: { slug, notifiedAt: { $exists: false } } },
        { $group: { _id: "$size", n: { $sum: 1 } } },
      ])
      .toArray(),
    orders.find({ "items.slug": slug }).sort({ createdAt: -1 }).limit(10).toArray(),
  ]);

  const byDay = new Map(daily.map((d) => [d._id, d.pairs]));
  const series: ListingDetail["daily"] = [];
  for (let i = 29; i >= 0; i--) {
    const key = new Date(now - i * DAY).toLocaleDateString("en-CA", { timeZone: TZ });
    if (!series.some((s) => s.day === key)) series.push({ day: key, pairs: byDay.get(key) ?? 0 });
  }

  return {
    stats: statsFor(all, slug),
    daily: series,
    bySize: bySize.map((s) => ({ size: s._id, pairs: s.pairs })),
    waitingBySize: Object.fromEntries(waiting.map((w) => [String(w._id), w.n])),
    recentOrders: recent.flatMap((o) =>
      (o.items as { slug: string; size: number; quantity: number; unitPrice: number }[])
        .filter((it) => it.slug === slug)
        .map((it) => ({
          id: o._id.toHexString(),
          number: o.number as string,
          customer: (o.customer as { name: string }).name,
          size: it.size,
          quantity: it.quantity,
          unitPrice: it.unitPrice,
          status: o.status as Order["status"],
          createdAt: (o.createdAt as Date).toISOString(),
        })),
    ),
  };
}
