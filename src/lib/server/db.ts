import "server-only";
import { MongoClient, type Db } from "mongodb";
import { emailKey } from "../identity-keys";

const uri = process.env.MONGODB_URI;

declare global {
  var __eloraMongo: Promise<MongoClient> | undefined;
  var __eloraIndexes: Promise<void> | undefined;
}

/** Shared MongoDB connection (reused across hot reloads in dev). */
export async function getDb(): Promise<Db> {
  if (!uri) throw new Error("MONGODB_URI is not set");
  globalThis.__eloraMongo ??= new MongoClient(uri).connect();
  const db = (await globalThis.__eloraMongo).db();
  globalThis.__eloraIndexes ??= ensureIndexes(db);
  await globalThis.__eloraIndexes;
  return db;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("products").createIndex({ slug: 1 }, { unique: true }),
    db.collection("products").createIndex({ status: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ number: 1 }, { unique: true }),
    db.collection("reviews").createIndex({ productSlug: 1, userId: 1 }, { unique: true }),
    db.collection("carts").createIndex({ "wishlist.slug": 1 }),
    db.collection("reviews").createIndex({ productSlug: 1, status: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ createdAt: -1 }),
    db.collection("orders").createIndex({ userId: 1, createdAt: -1 }),
    db.collection("orders").createIndex({ status: 1, createdAt: -1 }),
    db.collection("users").createIndex({ emailKey: 1 }),
    db.collection("orders").createIndex({ "customer.phoneKey": 1, "coupon.code": 1 }),
  ]);
  // Orders placed before "unviewed" highlighting existed count as seen, once
  // (owner, 2026-11-18), so only new orders light up in the admin.
  const meta = db.collection<{ _id: string; at: Date }>("meta");
  if (!(await meta.findOne({ _id: "orders-viewed-v1" }))) {
    await db.collection("orders").updateMany({ viewedAt: { $exists: false } }, [{ $set: { viewedAt: "$createdAt" } }]);
    await meta.updateOne({ _id: "orders-viewed-v1" }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  }
  // Accounts made before emailKey existed get it once (lib/identity-keys.ts).
  const users = db.collection<{ email: string; emailKey?: string }>("users");
  for (const u of await users.find({ emailKey: { $exists: false } }, { projection: { email: 1 } }).toArray()) {
    await users.updateOne({ _id: u._id }, { $set: { emailKey: emailKey(u.email) } });
  }
}
