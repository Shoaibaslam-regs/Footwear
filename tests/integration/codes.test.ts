import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/server/db";
import { checkCode, OTP, resendCode, startRegistration } from "@/lib/server/email-otp";
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
