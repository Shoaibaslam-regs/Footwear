import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/server/db";
import { RULES, blocked, clientIp, firstBlocked, hit } from "@/lib/server/rate-limit";
import { requestHeaders, resetDb } from "../setup/integration";

beforeEach(resetDb);

describe("rate limits", () => {
  it("login: 5 failed tries per email, then blocked for the rest of the 15 minutes", async () => {
    for (let i = 0; i < RULES.loginEmail.max; i++) expect(await hit(RULES.loginEmail, "a@example.com")).toBeNull();
    const wait = await blocked(RULES.loginEmail, "a@example.com");
    expect(wait).toBeGreaterThan(14 * 60);
    expect(wait).toBeLessThanOrEqual(15 * 60);
    // Another email is unaffected.
    expect(await blocked(RULES.loginEmail, "b@example.com")).toBeNull();
  });

  it("keys are case-insensitive, so A@Example.com counts with a@example.com", async () => {
    for (let i = 0; i < RULES.loginEmail.max; i++) await hit(RULES.loginEmail, "A@Example.com");
    expect(await blocked(RULES.loginEmail, "a@example.com")).not.toBeNull();
  });

  it("the attempt that goes over the limit is the one refused", async () => {
    for (let i = 0; i < RULES.registerIp.max; i++) expect(await hit(RULES.registerIp, "10.0.0.1")).toBeNull();
    expect(await hit(RULES.registerIp, "10.0.0.1")).toBeGreaterThan(0);
  });

  it("a new window starts once the old one has passed", async () => {
    for (let i = 0; i < RULES.couponUser.max; i++) await hit(RULES.couponUser, "user1");
    expect(await blocked(RULES.couponUser, "user1")).not.toBeNull();
    await (await getDb()).collection("rate_limits").updateOne({ _id: "coupon-user:user1" as never }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await blocked(RULES.couponUser, "user1")).toBeNull();
    expect(await hit(RULES.couponUser, "user1")).toBeNull();
    const doc = await (await getDb()).collection("rate_limits").findOne({ _id: "coupon-user:user1" as never });
    expect(doc?.n).toBe(1);
  });

  it("no key (no IP) is never limited", async () => {
    for (let i = 0; i < 30; i++) expect(await hit(RULES.loginIp, null)).toBeNull();
  });

  it("firstBlocked reports any limit that is reached", async () => {
    for (let i = 0; i < RULES.loginIp.max; i++) await hit(RULES.loginIp, "10.1.1.1");
    expect(await firstBlocked([RULES.loginEmail, "x@example.com"], [RULES.loginIp, "10.1.1.1"])).not.toBeNull();
    expect(await firstBlocked([RULES.loginEmail, "x@example.com"], [RULES.loginIp, "10.2.2.2"])).toBeNull();
  });

  it("parallel attempts can't slip past the limit", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, () => hit(RULES.adminLoginIp, "10.9.9.9")));
    expect(results.filter((r) => r === null)).toHaveLength(RULES.adminLoginIp.max);
  });

  it("reads the visitor IP from x-real-ip, else the last x-forwarded-for entry", async () => {
    requestHeaders.set("x-forwarded-for", "1.1.1.1, 2.2.2.2");
    expect(await clientIp()).toBe("2.2.2.2");
    requestHeaders.set("x-real-ip", "3.3.3.3");
    expect(await clientIp()).toBe("3.3.3.3");
  });
});
