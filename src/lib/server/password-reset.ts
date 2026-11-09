import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { ObjectId } from "mongodb";
import { getDb } from "./db";

const TTL_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_HOUR = 3;

type TokenDoc = { _id: string; userId: ObjectId; expiresAt: Date; createdAt: Date };

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function tokens() {
  const col = (await getDb()).collection<TokenDoc>("password_resets");
  await col.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  return col;
}

/**
 * Creates a single-use reset token. Only its hash is stored. Returns null when
 * this account already requested too many in the last hour.
 */
export async function createResetToken(userId: ObjectId): Promise<string | null> {
  const col = await tokens();
  const recent = await col.countDocuments({ userId, createdAt: { $gt: new Date(Date.now() - TTL_MS) } });
  if (recent >= MAX_PER_HOUR) return null;
  const raw = randomBytes(32).toString("base64url");
  await col.insertOne({ _id: sha256(raw), userId, createdAt: new Date(), expiresAt: new Date(Date.now() + TTL_MS) });
  return raw;
}

/** Validates without using up the token (for showing the form). */
export async function peekResetToken(raw: string): Promise<boolean> {
  if (!raw) return false;
  const doc = await (await tokens()).findOne({ _id: sha256(raw) });
  return !!doc && doc.expiresAt > new Date();
}

/** Uses the token: returns the user id once, then every token for that user is gone. */
export async function consumeResetToken(raw: string): Promise<ObjectId | null> {
  if (!raw) return null;
  const col = await tokens();
  const doc = await col.findOneAndDelete({ _id: sha256(raw) });
  if (!doc || doc.expiresAt <= new Date()) return null;
  await col.deleteMany({ userId: doc.userId });
  return doc.userId;
}
