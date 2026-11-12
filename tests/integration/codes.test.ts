import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { checkCode, OTP, resendCode, startRegistration } from "@/lib/server/email-otp";
import { checkOrderCode, needsOrderCode, orderFingerprint, resendOrderCode, startOrderCode, type CheckoutData } from "@/lib/server/order-codes";
import { resetDb, sentMail } from "../setup/integration";

beforeEach(resetDb);
const lastCode = () => sentMail.at(-1)?.code ?? "";
const wrong = (code: string) => (code === "000000" ? "111111" : "000000");
const age = async (collection: string, field: "lastSentAt" | "codeExpiresAt", ms: number) =>
  (await getDb()).collection(collection).updateMany({}, { $set: { [field]: new Date(Date.now() - ms) } });

describe("sign-up email code", () => {
  it("emails a 6-digit code, stores only its hash, and creates no account yet", async () => {
    expect(await startRegistration("sana@example.com", "Sana Malik", "scrypt$x$y")).toEqual({ ok: true });
    expect(sentMail).toHaveLength(1);
    expect(lastCode()).toMatch(/^\d{6}$/);
    expect(sentMail[0].subject).toContain(lastCode());
    const doc = await (await getDb()).collection("pending_registrations").findOne({ _id: "sana@example.com" as never });
    expect(doc?.codeHash).toBeDefined();
    expect(JSON.stringify(doc)).not.toContain(lastCode());
    expect(await (await getDb()).collection("users").countDocuments()).toBe(0);
  });

  it("a wrong code counts down the tries; the right one returns the sign-up once", async () => {
    await startRegistration("sana@example.com", "Sana Malik", "scrypt$x$y");
    const code = lastCode();
    expect(await checkCode("sana@example.com", wrong(code))).toMatchObject({ ok: false, error: "That code isn't right. 4 tries left." });
    expect(await checkCode("sana@example.com", code)).toEqual({ ok: true, name: "Sana Malik", passwordHash: "scrypt$x$y" });
    expect((await checkCode("sana@example.com", code)).ok).toBe(false); // used up
  });

  it("after 5 wrong tries even the right code is refused until a new one is sent", async () => {
    await startRegistration("sana@example.com", "Sana Malik", "h");
    const code = lastCode();
    for (let i = 0; i < OTP.maxAttempts; i++) await checkCode("sana@example.com", wrong(code));
    expect(await checkCode("sana@example.com", code)).toMatchObject({ ok: false, error: expect.stringMatching(/Too many wrong codes/) });
  });

  it("an expired code is refused", async () => {
    await startRegistration("sana@example.com", "Sana Malik", "h");
    await age("pending_registrations", "codeExpiresAt", 1000);
    expect(await checkCode("sana@example.com", lastCode())).toMatchObject({ ok: false, error: expect.stringMatching(/expired/) });
  });

  it("resend waits a minute, then sends a new code that replaces the old one", async () => {
    await startRegistration("sana@example.com", "Sana Malik", "h");
    const first = lastCode();
    expect(await resendCode("sana@example.com")).toMatchObject({ ok: false, retryAfter: expect.any(Number) });
    await age("pending_registrations", "lastSentAt", 61_000);
    expect(await resendCode("sana@example.com")).toEqual({ ok: true });
    const second = lastCode();
    if (second !== first) expect((await checkCode("sana@example.com", first)).ok).toBe(false);
    expect((await checkCode("sana@example.com", second)).ok).toBe(true);
  });

  it("submitting the form again within a minute doesn't send a second email", async () => {
    await startRegistration("sana@example.com", "Sana", "h1");
    await startRegistration("sana@example.com", "Sana", "h2");
    expect(sentMail).toHaveLength(1);
  });
});

describe("Cash on Delivery order code", () => {
  const data: CheckoutData = {
    name: "Nadia",
    email: "nadia@example.com",
    phone: "03001234567",
    line1: "1 Street",
    line2: "",
    city: "Karachi",
    postalCode: "75600",
    country: "PK",
    delivery: "std",
    paymentMethod: "cod",
    walletNumber: "",
  };

  it("new customers need a code; one delivered order is enough to skip it", async () => {
    const userId = new ObjectId();
    expect(await needsOrderCode(userId.toHexString())).toBe(true);
    await (await getDb()).collection("orders").insertOne({ number: "T-SHIPPED", userId, status: "shipped" });
    expect(await needsOrderCode(userId.toHexString())).toBe(true);
    await (await getDb()).collection("orders").insertOne({ number: "T-DELIVERED", userId, status: "delivered" });
    expect(await needsOrderCode(userId.toHexString())).toBe(false);
  });

  it("the fingerprint changes when anything about the order changes", () => {
    const base = { lines: [["heel", 38, 1, 9000]], total: 9350, data };
    expect(orderFingerprint(base)).toBe(orderFingerprint(structuredClone(base)));
    expect(orderFingerprint({ ...base, lines: [["heel", 38, 2, 9000]] })).not.toBe(orderFingerprint(base));
    expect(orderFingerprint({ ...base, data: { ...data, city: "Lahore" } })).not.toBe(orderFingerprint(base));
  });

  it("the right code returns exactly the saved checkout and fingerprint, once", async () => {
    const userId = new ObjectId().toHexString();
    expect(await startOrderCode(userId, data, "fp-1", 9350)).toEqual({ ok: true });
    expect(sentMail.at(-1)?.lines.join(" ")).toContain("PKR 9,350");
    const code = lastCode();
    expect(await checkOrderCode(userId, wrong(code))).toMatchObject({ ok: false, error: expect.stringMatching(/4 tries left/) });
    expect(await checkOrderCode(userId, code)).toEqual({ ok: true, data, fingerprint: "fp-1" });
    expect((await checkOrderCode(userId, code)).ok).toBe(false);
  });

  it("a code belongs to one account", async () => {
    const a = new ObjectId().toHexString();
    await startOrderCode(a, data, "fp", 100);
    expect((await checkOrderCode(new ObjectId().toHexString(), lastCode())).ok).toBe(false);
  });

  it("pressing Place Order again for a different order sends a fresh code at once", async () => {
    const userId = new ObjectId().toHexString();
    await startOrderCode(userId, data, "fp-1", 100);
    await startOrderCode(userId, data, "fp-1", 100); // same order within a minute: no new email
    expect(sentMail).toHaveLength(1);
    await startOrderCode(userId, data, "fp-2", 200); // the order changed
    expect(sentMail).toHaveLength(2);
    expect(await checkOrderCode(userId, lastCode())).toMatchObject({ ok: true, fingerprint: "fp-2" });
  });

  it("resend waits a minute between codes", async () => {
    const userId = new ObjectId().toHexString();
    await startOrderCode(userId, data, "fp", 100);
    expect(await resendOrderCode(userId)).toMatchObject({ ok: false, retryAfter: expect.any(Number) });
    await age("order_codes", "lastSentAt", 61_000);
    expect(await resendOrderCode(userId)).toEqual({ ok: true });
  });
});
