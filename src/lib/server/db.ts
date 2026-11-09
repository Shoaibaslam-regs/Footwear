import "server-only";
import { MongoClient, type Db } from "mongodb";

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
  ]);
}
