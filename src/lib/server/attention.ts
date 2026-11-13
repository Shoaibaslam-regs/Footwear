import "server-only";
import { io } from "next/cache";
import { queueStatuses } from "../orders";
import { adminGateOn } from "./admin-gate";
import { getDb } from "./db";
import { mailConfigured } from "./mail";
import { getSiteSettings } from "./settings";

const DAY = 86_400_000;
/** A waiting order this many days old is urgent. */
export const QUEUE_URGENT_DAYS = 3;
/** A parcel on the way this long is probably stuck with the courier. */
export const IN_TRANSIT_DAYS = 7;

/** Today in Pakistan, YYYY-MM-DD (expected delivery dates use the same form). */
export const pkToday = (now = Date.now()) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Karachi" }).format(new Date(now));

export type AttentionItem = {
  key: string;
  /** urgent: act today. todo: worth doing. setup: a missing setting. */
  tone: "urgent" | "todo" | "setup";
  title: string;
  hint: string;
  href?: string;
};

/** "3 days", "1 day", "5 hours" */
function age(ms: number) {
  const days = Math.floor(ms / DAY);
  if (days >= 1) return `${days} ${days === 1 ? "day" : "days"}`;
  const hours = Math.max(1, Math.floor(ms / 3_600_000));
  return `${hours} ${hours === 1 ? "hour" : "hours"}`;
}
const n = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

/**
 * The orders, money and setup that need the admin, most urgent first.
 * Callers must requireAdmin first.
 */
export async function getAttention(now = Date.now()): Promise<AttentionItem[]> {
  await io(); // reads the current time
  const db = await getDb();
  const orders = db.collection("orders");
  const today = pkToday(now);
  const onTheWay = ["shipped", "out_for_delivery"];
  const open = [...queueStatuses, ...onTheWay];

  const [waiting, oldest, toConfirm, late, noEta, stuck, unpaidCod, awaiting, restock, settings] = await Promise.all([
    orders.countDocuments({ status: { $in: queueStatuses } }),
    orders.find({ status: { $in: queueStatuses } }, { projection: { number: 1, createdAt: 1 } }).sort({ createdAt: 1 }).limit(1).next(),
    orders.countDocuments({ status: "pending" }),
    orders.countDocuments({ status: { $in: open }, "eta.to": { $lt: today } }),
    orders.countDocuments({ status: { $in: queueStatuses }, eta: { $exists: false } }),
    // On the way, with the last status change over a week ago.
    orders
      .aggregate<{ n: number }>([
        { $match: { status: { $in: onTheWay } } },
        { $project: { statusAt: { $max: { $map: { input: { $filter: { input: { $ifNull: ["$history", []] }, cond: { $eq: ["$$this.kind", "status"] } } }, in: "$$this.at" } } }, updatedAt: 1 } },
        { $match: { $expr: { $lt: [{ $ifNull: ["$statusAt", "$updatedAt"] }, new Date(now - IN_TRANSIT_DAYS * DAY)] } } },
        { $count: "n" },
      ])
      .toArray(),
    orders
      .aggregate<{ count: number; amount: number }>([
        { $match: { status: "delivered", "payment.method": "cod", "payment.status": "pending" } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$total" } } },
      ])
      .toArray(),
    // Payment still to come in, apart from the delivered COD orders counted above.
    orders
      .aggregate<{ count: number; amount: number }>([
        { $match: { status: { $ne: "cancelled" }, "payment.status": "pending", $nor: [{ status: "delivered", "payment.method": "cod" }] } },
        { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: "$total" } } },
      ])
      .toArray(),
    db.collection("stock_alerts").countDocuments({ notifiedAt: { $exists: false } }),
    getSiteSettings(),
  ]);

  const items: AttentionItem[] = [];
  if (late > 0) {
    items.push({
      key: "late",
      tone: "urgent",
      title: `${n(late, "order is", "orders are")} past the expected delivery date`,
      hint: "Tell the customer the new date, or check with the courier.",
      href: "/admin/orders?eta=late",
    });
  }
  if (waiting > 0 && oldest) {
    const waited = now - new Date(oldest.createdAt).getTime();
    items.push({
      key: "queue",
      tone: waited >= QUEUE_URGENT_DAYS * DAY ? "urgent" : "todo",
      title: `${n(waiting, "order", "orders")} waiting to be sent`,
      hint: `The oldest, ${oldest.number}, has waited ${age(waited)}. First come, first served.`,
      href: "/admin/orders",
    });
  }
  if (toConfirm > 0) {
    items.push({
      key: "confirm",
      tone: "todo",
      title: `${n(toConfirm, "new order", "new orders")} to confirm`,
      hint: "Call or message the customer, then confirm.",
      href: "/admin/orders?status=pending",
    });
  }
  if (stuck[0]?.n) {
    items.push({
      key: "stuck",
      tone: "urgent",
      title: `${n(stuck[0].n, "parcel has", "parcels have")} been on the way for over ${IN_TRANSIT_DAYS} days`,
      hint: "It may be stuck: check the tracking number with the courier.",
      href: "/admin/orders?status=shipped",
    });
  }
  if (unpaidCod[0]?.count) {
    items.push({
      key: "cod",
      tone: "todo",
      title: `${n(unpaidCod[0].count, "delivered Cash on Delivery order", "delivered Cash on Delivery orders")} not marked paid`,
      hint: `PKR ${unpaidCod[0].amount.toLocaleString("en-US")} to collect from the courier, then mark it paid.`,
      href: "/admin/orders?status=delivered&payment=pending",
    });
  }
  if (awaiting[0]?.count) {
    items.push({
      key: "payment",
      tone: "todo",
      title: `PKR ${awaiting[0].amount.toLocaleString("en-US")} awaiting payment`,
      hint: `${n(awaiting[0].count, "open order", "open orders")} not yet marked paid.`,
      href: "/admin/orders?payment=pending",
    });
  }
  if (noEta > 0) {
    items.push({
      key: "no-eta",
      tone: "todo",
      title: `${n(noEta, "waiting order has", "waiting orders have")} no expected delivery date`,
      hint: "Set one so the customer knows when to expect the parcel.",
      href: "/admin/orders?eta=none",
    });
  }
  if (restock > 0) {
    items.push({
      key: "restock",
      tone: "todo",
      title: `${n(restock, "“notify me” request", "“notify me” requests")}`,
      hint: "Customers are waiting for a sold-out size. Restocking emails them.",
      href: "/admin/products",
    });
  }
  if (!settings.deliveryConfigured) {
    items.push({ key: "delivery", tone: "setup", title: "Delivery options are not set up", hint: "Customers see a placeholder “Standard Delivery” at PKR 0.", href: "/admin/settings" });
  }
  if (!mailConfigured()) {
    items.push({ key: "mail", tone: "setup", title: "Email is off", hint: "No order emails, sign-up codes or password resets are sent. Add the SMTP settings in Vercel." });
  }
  if (!adminGateOn()) {
    items.push({ key: "gate", tone: "setup", title: "The hidden admin login is off", hint: "Add ADMIN_SECRET (12+ characters) in Vercel so admins can only log in through it." });
  }
  const order = { urgent: 0, todo: 1, setup: 2 };
  return items.sort((a, b) => order[a.tone] - order[b.tone]);
}
