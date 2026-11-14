import { randomBytes, scryptSync } from "node:crypto";
import { existsSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { SignJWT } from "jose";
import { MongoClient, ObjectId, type Db } from "mongodb";
import { assertSafe, deriveUri } from "../helpers/test-db";

if (existsSync(".env")) process.loadEnvFile(".env");
export const BASE = "http://localhost:3457";
export const ADMIN_SECRET = "e2e-admin-door-secret"; // set by tests/e2e/server.mjs

let client: MongoClient | undefined;
/** The same throwaway database the test server uses. */
export async function db(): Promise<Db> {
  const base = process.env.MONGODB_E2E_URI || process.env.MONGODB_URI;
  if (!base) throw new Error("Set MONGODB_URI (in .env) or MONGODB_E2E_URI.");
  const uri = process.env.MONGODB_E2E_URI || deriveUri(base, "_e2e");
  assertSafe(uri, "_e2e");
  client ??= await new MongoClient(uri).connect();
  return client.db();
}

export const hashPassword = (pw: string) => {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString("hex")}$${scryptSync(pw, salt, 64).toString("hex")}`;
};

/** A login cookie for an account, signed like the real one. */
export const sessionFor = (id: ObjectId, role: "admin" | "customer") =>
  new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(id.toHexString())
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(new TextEncoder().encode(process.env.JWT_SECRET));

export async function createUser(u: { name: string; email: string; password?: string; role?: "admin" | "customer"; savedAddress?: object }) {
  const _id = new ObjectId();
  await (await db()).collection("users").insertOne({
    _id,
    name: u.name,
    email: u.email.toLowerCase(),
    passwordHash: hashPassword(u.password ?? "Secret123"),
    role: u.role ?? "customer",
    createdAt: new Date(),
    ...(u.savedAddress ? { savedAddress: u.savedAddress } : {}),
  });
  return _id;
}

export async function logInAs(page: Page, id: ObjectId, role: "admin" | "customer") {
  await page.context().addCookies([{ name: "elora_session", value: await sessionFor(id, role), url: BASE }]);
}

/** An admin, and the product catalogue (created the first time the admin opens Listings). */
export async function setupStore() {
  const d = await db();
  let admin = await d.collection("users").findOne({ role: "admin" });
  if (!admin) {
    const id = await createUser({ name: "Owner", email: "owner@example.com", password: "AdminPass1", role: "admin" });
    admin = { _id: id };
  }
  const res = await fetch(`${BASE}/admin/products`, { headers: { cookie: `elora_session=${await sessionFor(admin._id, "admin")}` } });
  expect(res.ok).toBe(true);
  await res.text(); // the page streams: the catalogue is created while it renders
  return admin._id as ObjectId;
}

/** A full-price shoe that the running store shows on /collections. */
export async function pickShoe() {
  const html = await (await fetch(`${BASE}/collections`)).text();
  const onSite = new Set([...html.matchAll(/\/products\/([a-z0-9-]+)/g)].map((x) => x[1]));
  const shoes = await (await db()).collection("products").find({ status: "published", discountPercent: 0 }).sort({ price: -1 }).toArray();
  const shoe = shoes.find((s) => onSite.has(s.slug) && s.sizes?.length);
  if (!shoe) throw new Error("No published full-price shoe found on /collections");
  return shoe as unknown as { slug: string; name: string; price: number; sizes: number[] };
}

export async function putInBag(userId: ObjectId, slug: string, size: number, quantity = 1) {
  await (await db()).collection("carts").updateOne(
    { _id: userId },
    { $set: { bag: [{ slug, size, quantity, addedAt: new Date() }], wishlist: [] } },
    { upsert: true },
  );
}

/**
 * Gives the account a delivered order, so Cash on Delivery places at once
 * (only first-time customers confirm it with an email code).
 */
export async function makeReturning(userId: ObjectId) {
  const now = new Date(Date.now() - 30 * 86_400_000);
  await (await db()).collection("orders").insertOne({
    _id: new ObjectId(), number: `PAST-${userId.toHexString().slice(-6)}`, userId, status: "delivered",
    customer: { name: "Past order", email: "past@example.com", phone: address.phone },
    address: { ...address, country: "PK" }, items: [], listTotal: 0, discountTotal: 0, shippingFee: 0, total: 0,
    delivery: { id: "standard", name: "Standard Delivery" }, payment: { method: "cod", status: "paid", reference: "" },
    trackingNumber: "", history: [], statusDates: {}, createdAt: now, updatedAt: now,
  });
}

/** Emails the fake mail server received for this address (newest last). */
export async function mailTo(email: string): Promise<{ subject: string; code: string | null; links: string[] }[]> {
  const res = await fetch(`http://127.0.0.1:2526/messages?to=${encodeURIComponent(email.toLowerCase())}`);
  return res.json();
}

/** Waits for the next email to this address and returns its 6-digit code. */
export async function waitForCode(email: string, after = 0): Promise<string> {
  for (let i = 0; i < 60; i++) {
    const mails = await mailTo(email);
    const code = mails.slice(after).find((m) => m.code)?.code;
    if (code) return code;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No code email for ${email}`);
}

/** Types a code into the six boxes (the last digit submits by itself). */
export async function typeCode(page: Page, code: string) {
  await page.getByLabel("Digit 1 of 6").click();
  await page.keyboard.type(code, { delay: 40 });
}

export const address = { phone: "03001234567", line1: "12 Clifton Block 5", line2: "", city: "Karachi", postalCode: "75600" };
