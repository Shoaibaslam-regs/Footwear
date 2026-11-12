import { afterEach, describe, expect, it } from "vitest";
import { adminGateOn, gatePass, isAdminSecret, validGatePass } from "@/lib/server/admin-gate";

const before = { ...process.env };
afterEach(() => {
  process.env.ADMIN_SECRET = before.ADMIN_SECRET;
  process.env.JWT_SECRET = before.JWT_SECRET;
});

describe("hidden admin login", () => {
  it("is off without a secret of 12+ characters, so nobody is locked out", () => {
    delete process.env.ADMIN_SECRET;
    expect(adminGateOn()).toBe(false);
    process.env.ADMIN_SECRET = "short";
    expect(adminGateOn()).toBe(false);
    expect(isAdminSecret("short")).toBe(false);
  });

  it("matches only the exact secret (spaces around it are forgiven)", () => {
    process.env.ADMIN_SECRET = "a-long-door-secret-42";
    expect(adminGateOn()).toBe(true);
    expect(isAdminSecret("a-long-door-secret-42")).toBe(true);
    expect(isAdminSecret("  a-long-door-secret-42 ")).toBe(true);
    expect(isAdminSecret("a-long-door-secret-43")).toBe(false);
    expect(isAdminSecret("")).toBe(false);
  });

  it("the 10-minute pass is accepted, and forged or foreign passes are not", async () => {
    process.env.JWT_SECRET = "test-secret-that-is-at-least-32-characters-long";
    const pass = await gatePass();
    expect(await validGatePass(pass)).toBe(true);
    expect(await validGatePass("forged")).toBe(false);
    expect(await validGatePass("")).toBe(false);
    process.env.JWT_SECRET = "another-secret-that-is-at-least-32-characters";
    expect(await validGatePass(pass)).toBe(false);
  });
});
