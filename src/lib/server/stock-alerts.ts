import "server-only";
import { ObjectId } from "mongodb";
import { getDb } from "./db";
import { sendMail, siteUrl } from "./mail";

type AlertDoc = {
  _id: ObjectId;
  slug: string;
  size: number;
  userId: ObjectId;
  email: string;
  createdAt: Date;
  notifiedAt?: Date;
};

async function alerts() {
  const col = (await getDb()).collection<AlertDoc>("stock_alerts");
  await col.createIndex({ slug: 1, size: 1, userId: 1 }, { unique: true });
  return col;
}

export async function addStockAlert(slug: string, size: number, userId: string, email: string) {
  await (await alerts()).updateOne(
    { slug, size, userId: new ObjectId(userId) },
    { $set: { email, createdAt: new Date() }, $unset: { notifiedAt: "" }, $setOnInsert: { _id: new ObjectId() } },
    { upsert: true },
  );
}

/** Waiting (not yet notified) requests per product slug, for the admin list. */
export async function waitingBySlug(): Promise<Record<string, number>> {
  const rows = await (await alerts())
    .aggregate<{ _id: string; n: number }>([{ $match: { notifiedAt: { $exists: false } } }, { $group: { _id: "$slug", n: { $sum: 1 } } }])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, r.n]));
}

/** Emails everyone waiting for these sizes (if email is set up) and marks them notified. */
export async function notifyRestocked(slug: string, name: string, sizes: number[]) {
  if (sizes.length === 0) return 0;
  const col = await alerts();
  const waiting = await col.find({ slug, size: { $in: sizes }, notifiedAt: { $exists: false } }).toArray();
  const base = await siteUrl();
  for (const a of waiting) {
    await sendMail(a.email, `Back in stock: ${name} (EU ${a.size}) — Ŕose Atelier`, "It's back in your size", [
      `${name} is available again in EU ${a.size}.`,
      "Pairs are limited, so they may not last long.",
    ], { label: "Shop now", href: `${base}/products/${slug}` });
  }
  await col.updateMany({ _id: { $in: waiting.map((w) => w._id) } }, { $set: { notifiedAt: new Date() } });
  return waiting.length;
}
