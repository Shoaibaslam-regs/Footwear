import { describe, expect, it } from "vitest";
import { checkoutProgress, stepsCompleted } from "@/lib/checkout-progress";

const form = (over: Record<string, string> = {}) => {
  const fd = new FormData();
  const base: Record<string, string> = {
    name: "Ayesha Khan", email: "ayesha@example.com", phone: "0300 1234567", line1: "12 Clifton Block 5", line2: "",
    city: "Karachi", postalCode: "75600", country: "PK", delivery: "standard", paymentMethod: "cod", walletNumber: "",
    ...over,
  };
  for (const [k, v] of Object.entries(base)) if (v !== "__none") fd.set(k, v);
  return fd;
};

describe("checkout progress", () => {
  it("a full form completes all four steps", () => {
    expect(checkoutProgress(form())).toEqual({ contact: true, address: true, delivery: true, payment: true });
    expect(stepsCompleted(checkoutProgress(form()))).toBe(4);
  });

  it("any empty required box stops the bar at its step", () => {
    expect(stepsCompleted(checkoutProgress(form({ name: "  " })))).toBe(0);
    expect(stepsCompleted(checkoutProgress(form({ email: "ayesha@" })))).toBe(0);
    expect(stepsCompleted(checkoutProgress(form({ city: "" })))).toBe(1);
    expect(stepsCompleted(checkoutProgress(form({ postalCode: "" })))).toBe(1);
    expect(stepsCompleted(checkoutProgress(form({ phone: "12" })))).toBe(1);
    expect(stepsCompleted(checkoutProgress(form({ delivery: "__none" })))).toBe(2);
    expect(stepsCompleted(checkoutProgress(form({ paymentMethod: "__none" })))).toBe(3);
  });

  it("the optional flat/floor box doesn't matter", () => {
    expect(checkoutProgress(form({ line2: "" })).address).toBe(true);
  });

  it("a later step done doesn't count while an earlier one is missing", () => {
    const p = checkoutProgress(form({ line1: "" }));
    expect(p.delivery && p.payment).toBe(true);
    expect(stepsCompleted(p)).toBe(1);
  });

  it("wallet payments need a valid 03XXXXXXXXX number", () => {
    expect(checkoutProgress(form({ paymentMethod: "easypaisa", walletNumber: "" })).payment).toBe(false);
    expect(checkoutProgress(form({ paymentMethod: "easypaisa", walletNumber: "+92 300 1234567" })).payment).toBe(true);
  });
});
