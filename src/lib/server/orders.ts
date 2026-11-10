import "server-only";
import { randomInt } from "node:crypto";
import { MongoServerError, ObjectId } from "mongodb";
import { orderStatusLabel } from "../orders";
import type {
  Order,
  OrderEvent,
  OrderStatus,
  PaymentStatus,
} from "../orders";
import { getDb } from "./db";

export type OrderDoc = Omit<Order, "id" | "userId" | "createdAt" | "updatedAt" | "history"> & {
  _id: ObjectId;
  userId: ObjectId | null;
  history: (Omit<OrderEvent, "at"> & { at: Date })[];
  createdAt: Date;
  updatedAt: Date;
};

function toOrder(d: OrderDoc): Order {
  const { _id, userId, history, createdAt, updatedAt, ...rest } = d;
  return {
    ...rest,
    id: _id.toHexString(),
    userId: userId ? userId.toHexString() : null,
    history: history.map((h) => ({ ...h, at: h.at.toISOString() })),
    createdAt: createdAt.toISOString(),
    updatedAt: updatedAt.toISOString(),
  };
}

const orders = async () => (await getDb()).collection<OrderDoc>("orders");

/** Human-friendly order number, e.g. EL-7K3P9Q (no 0/O/1/I). */
function newOrderNumber() {
  const alphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  let s = "";
  for (let i = 0; i < 6; i++) s += alphabet[randomInt(alphabet.length)];
  return `EL-${s}`;
}

export async function insertOrder(
  data: Omit<OrderDoc, "_id" | "number" | "createdAt" | "updatedAt" | "history">,
): Promise<Order> {
  const col = await orders();
  const now = new Date();
  for (let attempt = 0; attempt < 5; attempt++) {
    const doc: OrderDoc = {
      ...data,
      _id: new ObjectId(),
      number: newOrderNumber(),
      history: [{ at: now, kind: "status", text: "Order placed", by: "customer" }],
      createdAt: now,
      updatedAt: now,
    };
    try {
      await col.insertOne(doc);
      return toOrder(doc);
    } catch (e) {
      if (e instanceof MongoServerError && e.code === 11000) continue; // number clash
      throw e;
    }
  }
  throw new Error("Could not allocate an order number");
}

/* ---------- Admin reads (callers must requireAdmin first) ---------- */

export async function listOrders(opts: {
  q?: string;
  status?: OrderStatus;
  payment?: PaymentStatus;
} = {}): Promise<Order[]> {
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.payment) filter["payment.status"] = opts.payment;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ number: rx }, { "customer.email": rx }, { "customer.name": rx }, { "customer.phone": rx }, { "coupon.code": rx }];
  }
  const docs = await (await orders()).find(filter).sort({ createdAt: -1 }).limit(500).toArray();
  return docs.map(toOrder);
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!ObjectId.isValid(id)) return null;
  const doc = await (await orders()).findOne({ _id: new ObjectId(id) });
  return doc ? toOrder(doc) : null;
}

export async function orderStats() {
  const col = await orders();
  const [byStatus, revenue] = await Promise.all([
    col.aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]).toArray(),
    col
      .aggregate<{ _id: null; paid: number; outstanding: number }>([
        { $match: { status: { $ne: "cancelled" } } },
        {
          $group: {
            _id: null,
            paid: { $sum: { $cond: [{ $eq: ["$payment.status", "paid"] }, "$total", 0] } },
            outstanding: { $sum: { $cond: [{ $eq: ["$payment.status", "pending"] }, "$total", 0] } },
          },
        },
      ])
      .toArray(),
  ]);
  const counts = Object.fromEntries(byStatus.map((s) => [s._id, s.n])) as Partial<Record<OrderStatus, number>>;
  return {
    counts,
    total: byStatus.reduce((n, s) => n + s.n, 0),
    paidRevenue: revenue[0]?.paid ?? 0,
    outstanding: revenue[0]?.outstanding ?? 0,
  };
}

/* ---------- Customer reads ---------- */

export async function listOrdersForUser(userId: string): Promise<Order[]> {
  if (!ObjectId.isValid(userId)) return [];
  const docs = await (await orders())
    .find({ userId: new ObjectId(userId) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();
  return docs.map(toOrder);
}

/** One of the signed-in client's own orders, by its number. */
export async function getOrderForUser(number: string, userId: string): Promise<Order | null> {
  if (!ObjectId.isValid(userId) || !/^EL-[A-Z0-9]{6}$/.test(number)) return null;
  const doc = await (await orders()).findOne({ number, userId: new ObjectId(userId) });
  return doc ? toOrder(doc) : null;
}

/** When each status was first reached (from the history), for the customer timeline. */
export function statusDates(o: Pick<Order, "history" | "createdAt">): Partial<Record<OrderStatus, string>> {
  const out: Partial<Record<OrderStatus, string>> = { pending: o.createdAt };
  const labels = Object.entries(orderStatusLabel) as [OrderStatus, string][];
  for (const h of o.history) {
    if (h.kind !== "status") continue;
    const hit = labels.find(([, label]) => h.text.startsWith(label));
    if (hit && !out[hit[0]]) out[hit[0]] = h.at;
  }
  return out;
}

/* ---------- Admin writes ---------- */

export async function updateOrder(
  id: string,
  set: Partial<{ status: OrderStatus; "payment.status": PaymentStatus; "payment.reference": string; trackingNumber: string }>,
  event: Omit<OrderEvent, "at">,
  expectStatus?: OrderStatus,
) {
  if (!ObjectId.isValid(id)) return false;
  const now = new Date();
  const res = await (await orders()).updateOne(
    { _id: new ObjectId(id), ...(expectStatus ? { status: expectStatus } : {}) },
    { $set: { ...set, updatedAt: now }, $push: { history: { ...event, at: now } } },
  );
  return res.matchedCount === 1;
}

