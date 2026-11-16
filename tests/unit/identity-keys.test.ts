import { describe, expect, it } from "vitest";
import { emailKey, phoneKey } from "@/lib/identity-keys";

describe("identity keys", () => {
  it("Gmail aliases are the same inbox", () => {
    expect(emailKey("A.Yesha+sale@Gmail.com")).toBe("ayesha@gmail.com");
    expect(emailKey("ayesha@googlemail.com")).toBe("ayesha@gmail.com");
    expect(emailKey("a.yesha@outlook.com")).toBe("a.yesha@outlook.com"); // dots matter elsewhere
    expect(emailKey("ayesha+2@outlook.com")).toBe("ayesha@outlook.com");
  });
  it("Pakistani phone numbers in any format are the same number", () => {
    for (const p of ["03001234567", "0300-1234567", "+92 300 1234567", "923001234567", "0092 300 1234567"]) expect(phoneKey(p)).toBe("03001234567");
  });
});
