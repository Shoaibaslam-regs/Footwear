import "server-only";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { getDb } from "../server/db";
import type { Role } from "./jwt";
import { readSession } from "./session";

/** The only user shape that leaves the server. */
export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export type UserDoc = {
  _id: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  createdAt: Date;
  /** Sessions issued before this are rejected (set on password change). */
  passwordChangedAt?: Date;
  /** Last delivery details used at checkout (prefills the next one). */
  savedAddress?: SavedAddress;
};

export type SavedAddress = { phone: string; line1: string; line2: string; city: string; postalCode: string };

/**
 * Verifies the JWT, then re-reads the user from MongoDB so a deleted user
 * or a changed role takes effect immediately (the token alone is not trusted
 * for authorization).
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await readSession();
  if (!session || !ObjectId.isValid(session.sub)) return null;
  const db = await getDb();
  const user = await db
    .collection<UserDoc>("users")
    .findOne({ _id: new ObjectId(session.sub) }, { projection: { passwordHash: 0 } });
  if (!user) return null;
  // A password change signs out every session issued before it.
  if (user.passwordChangedAt && session.iat && session.iat * 1000 < user.passwordChangedAt.getTime() - 1000) return null;
  return { id: user._id.toHexString(), name: user.name, email: user.email, role: user.role };
}

export async function requireUser(next = "/account"): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireUser("/admin");
  if (user.role !== "admin") redirect("/account?denied=admin");
  return user;
}

/** Last delivery details this client used (prefills checkout). */
export async function getSavedAddress(userId: string): Promise<SavedAddress | null> {
  if (!ObjectId.isValid(userId)) return null;
  const u = await (await getDb())
    .collection<UserDoc>("users")
    .findOne({ _id: new ObjectId(userId) }, { projection: { savedAddress: 1 } });
  return u?.savedAddress ?? null;
}
