import "server-only";
import type { UserDoc } from "../auth/dal";
import type { Role } from "../auth/jwt";
import { getDb } from "./db";

export type UserRow = { id: string; name: string; email: string; role: Role; createdAt: string };

/** Callers must `requireAdmin()` first. */
export async function listUsers(): Promise<UserRow[]> {
  const docs = await (await getDb())
    .collection<UserDoc>("users")
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: -1 })
    .toArray();
  return docs.map((u) => ({
    id: u._id.toHexString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));
}
