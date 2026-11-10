import "server-only";
import { io } from "next/cache";
import type { OrderStatus } from "../orders";
import { getDb } from "./db";

export const RANGES = [7, 30, 90] as const;
export type RangeDays = (typeof RANGES)[number];

const TZ = "Asia/Karachi";
const DAY = 86_400_000;
const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: TZ }); // YYYY-MM-DD

export type DashboardData = {
  days: RangeDays;
  kpis: {
    revenue: { now: number; before: number };
    orders: { now: number; before: number };
    avgOrder: { now: number; before: number };
    paid: { now: number; before: number };
  };
  daily: { day: string; revenue: number; orders: number }[];
  byStatus: { status: OrderStatus; count: number }[];
  topProducts: { slug: string; name: string; pairs: number; revenue: number }[];
  attention: {
    toConfirm: number;
    awaitingPayment: { count: number; amount: number };
    lowStock: { id: string; name: string; size: number; left: number }[];
    restockRequests: number;
  };
};

/**
 * Everything the admin overview shows, for the last `days` days (rolling) and
 * the same-length period before it. Days are Pakistan calendar days.
 * Callers must requireAdmin first.
 */
export async function getDashboard(days: RangeDays): Promise<DashboardData> {
  await io(); // reads the current time; see lib/server/coupons.ts
  const db = await getDb();
  const orders = db.collection("orders");
  const now = Date.now();
  const start = new Date(now - days * DAY);
  const prevStart = new Date(now - 2 * days * DAY);
  const live = { status: { $ne: "cancelled" } };

  const [windows, daily, byStatus, top, toConfirm, awaiting, products, restock] = await Promise.all([
    orders
      .aggregate<{ _id: "now" | "before"; revenue: number; orders: number; paid: number }>([
        { $match: { createdAt: { $gte: prevStart }, ...live } },
        {
          $group: {
            _id: { $cond: [{ $gte: ["$createdAt", start] }, "now", "before"] },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
            paid: { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$total", 0] } },
          },
        },
      ])
      .toArray(),
    orders
      .aggregate<{ _id: string; revenue: number; orders: number }>([
        { $match: { createdAt: { $gte: start }, ...live } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: TZ } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    orders
      .aggregate<{ _id: OrderStatus; count: number }>([
        { $match: { createdAt: { $gte: start } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ])
      .toArray(),
    orders
      .aggregate<{ _id: string; name: string; pairs: number; revenue: number }>([
        { $match: { createdAt: { $gte: start }, ...live } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.slug",
            name: { $first: "$items.name" },
            pairs: { $sum: "$items.quantity" },
            revenue: { $sum: { $multiply: ["$items.unitPrice", "$items.quantity"] } },
          },
        },
        { $sort: { pairs: -1, revenue: -1 } },
        { $limit: 6 },
      ])
      .toArray(),
    orders.countDocuments({ status: "pending" }),
    orders
      .aggregate<{ _id: null; count: number; amount: number }>([
        { $match: { ...live, "payment.status": "pending" } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$total" } } },
      ])
      .toArray(),
    db.collection("products").find({ stock: { $exists: true } }, { projection: { slug: 1, name: 1, stock: 1, sizes: 1 } }).toArray(),
    db.collection("stock_alerts").countDocuments({ notifiedAt: { $exists: false } }),
  ]);

  const w = (k: "now" | "before") => windows.find((x) => x._id === k) ?? { revenue: 0, orders: 0, paid: 0 };
  const cur = w("now");
  const prev = w("before");

  // One entry per calendar day, oldest first (days with no orders = 0).
  const byDay = new Map(daily.map((d) => [d._id, d]));
  const series: DashboardData["daily"] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = dayKey(new Date(now - i * DAY));
    if (series.some((s) => s.day === key)) continue;
    const d = byDay.get(key);
    series.push({ day: key, revenue: d?.revenue ?? 0, orders: d?.orders ?? 0 });
  }

  const lowStock = products
    .flatMap((p) =>
      Object.entries((p.stock ?? {}) as Record<string, number>)
        .filter(([size, left]) => left <= 3 && (p.sizes as number[]).includes(Number(size)))
        .map(([size, left]) => ({ id: p._id.toString(), name: p.name as string, size: Number(size), left })),
    )
    .sort((a, b) => a.left - b.left)
    .slice(0, 8);

  return {
    days,
    kpis: {
      revenue: { now: cur.revenue, before: prev.revenue },
      orders: { now: cur.orders, before: prev.orders },
      avgOrder: {
        now: cur.orders ? Math.round(cur.revenue / cur.orders) : 0,
        before: prev.orders ? Math.round(prev.revenue / prev.orders) : 0,
      },
      paid: { now: cur.paid, before: prev.paid },
    },
    daily: series,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    topProducts: top.map((t) => ({ slug: t._id, name: t.name, pairs: t.pairs, revenue: t.revenue })),
    attention: {
      toConfirm,
      awaitingPayment: { count: awaiting[0]?.count ?? 0, amount: awaiting[0]?.amount ?? 0 },
      lowStock,
      restockRequests: restock,
    },
  };
}
