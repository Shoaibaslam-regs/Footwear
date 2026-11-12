/**
 * Integration tests run server modules against the throwaway database.
 * Next.js request APIs are replaced by small stand-ins, and email is captured
 * in `sentMail` instead of being sent.
 */
import { afterAll, beforeAll, vi } from "vitest";
import { testDbUri } from "../helpers/test-db";

process.env.MONGODB_URI = testDbUri("_test"); // before any module reads it
process.env.JWT_SECRET ||= "test-secret-that-is-at-least-32-characters-long";
process.env.SMTP_HOST = "test.invalid";
process.env.SMTP_USER = "test";
process.env.SMTP_PASS = "test";
process.env.MAIL_FROM = "Ŕose Atelier <shop@example.com>";
process.env.SITE_URL = "https://shop.example.com";

/** Request headers the next/headers stand-in returns (set per test). */
export const requestHeaders = new Headers();

export type SentMail = { to: string; subject: string; title: string; lines: string[]; code?: string };
export const sentMail: SentMail[] = [];

vi.mock("next/headers", () => ({
  headers: async () => requestHeaders,
  cookies: async () => ({ get: () => undefined, set: () => {}, delete: () => {} }),
}));
vi.mock("next/cache", () => ({
  io: async () => {},
  cacheTag: () => {},
  cacheLife: () => {},
  updateTag: () => {},
  revalidatePath: () => {},
  refresh: () => {},
}));
vi.mock("@/lib/server/mail", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/server/mail")>();
  return {
    ...real,
    mailConfigured: () => true,
    sendMail: async (to: string, subject: string, title: string, lines: string[], _cta?: unknown, code?: string) => {
      sentMail.push({ to, subject, title, lines, code });
      return true;
    },
  };
});

/** Empties every collection (indexes are kept). */
export async function resetDb() {
  const { getDb } = await import("@/lib/server/db");
  const db = await getDb();
  if (!db.databaseName.endsWith("_test")) throw new Error("not a _test database");
  for (const c of await db.collections()) await c.deleteMany({});
  sentMail.length = 0;
  for (const k of [...requestHeaders.keys()]) requestHeaders.delete(k);
}

beforeAll(resetDb);
afterAll(async () => {
  const client = await globalThis.__eloraMongo;
  await client?.close();
  globalThis.__eloraMongo = undefined;
  globalThis.__eloraIndexes = undefined;
});
