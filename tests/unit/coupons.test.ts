import { describe, expect, it } from "vitest";
import { applyCoupon, CODE_RX, couponConditions, couponHeadline, normaliseCode, priceWithCoupon, type CouponTerms } from "@/lib/coupons";

const terms = (t: Partial<CouponTerms>): CouponTerms => ({
  code: "TEST",
  type: "percent",
  value: 20,
  maxDiscount: null,
  minOrder: null,
  fullPriceOnly: true,
  startsAt: null,
  endsAt: null,
  perCustomer: 1,
  ...t,
});
const full = (unitPrice: number, quantity = 1) => ({ unitPrice, quantity, discountPercent: 0 });
const onSale = (unitPrice: number, quantity = 1) => ({ unitPrice, quantity, discountPercent: 30 });

describe("applyCoupon: the discount maths shared by checkout and placeOrder", () => {
  it("takes a percentage off full-price items, rounded to whole rupees", () => {
    const r = applyCoupon(terms({ value: 15 }), [full(9_999)], 350);
    expect(r).toMatchObject({ ok: true, itemDiscount: 1_500, deliveryDiscount: 0 });
  });

  it("caps a percentage at maxDiscount", () => {
    const r = applyCoupon(terms({ value: 50, maxDiscount: 5_000 }), [full(40_000)], 0);
    expect(r).toMatchObject({ ok: true, itemDiscount: 5_000 });
  });

  it("skips items already on sale when fullPriceOnly is on", () => {
    const r = applyCoupon(terms({ value: 10 }), [full(10_000), onSale(20_000)], 0);
    expect(r).toMatchObject({ ok: true, itemDiscount: 1_000, eligibleTotal: 10_000 });
  });

  it("refuses when every item is on sale", () => {
    const r = applyCoupon(terms({}), [onSale(20_000)], 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/sale items/);
  });

  it("includes sale items when fullPriceOnly is off", () => {
    const r = applyCoupon(terms({ value: 10, fullPriceOnly: false }), [full(10_000), onSale(20_000)], 0);
    expect(r).toMatchObject({ ok: true, itemDiscount: 3_000 });
  });

  it("never takes more than the eligible total for a fixed amount", () => {
    const r = applyCoupon(terms({ type: "fixed", value: 50_000 }), [full(12_000)], 300);
    expect(r).toMatchObject({ ok: true, itemDiscount: 12_000 });
  });

  it("checks the minimum order against the whole bag and says how much is missing", () => {
    const r = applyCoupon(terms({ minOrder: 20_000 }), [full(15_500)], 0);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe("Add Rs 4,500 more to use this code.");
  });

  it("free delivery waives the delivery fee, and refuses when delivery is already free", () => {
    expect(applyCoupon(terms({ type: "free_delivery", value: 0 }), [full(5_000)], 450)).toMatchObject({ ok: true, itemDiscount: 0, deliveryDiscount: 450 });
    expect(applyCoupon(terms({ type: "free_delivery", value: 0 }), [full(5_000)], 0).ok).toBe(false);
  });

  it("never applies a surprise campaign code directly", () => {
    const r = applyCoupon(terms({ type: "random", range: [10, 60] }), [full(10_000)], 0);
    expect(r.ok).toBe(false);
  });
});

describe("priceWithCoupon: 'with coupon' prices on the offer page", () => {
  it("shows the price after the discount", () => {
    expect(priceWithCoupon(terms({ value: 25 }), 8_000, 0)).toBe(6_000);
  });
  it("has no coupon price for sale items, free delivery or surprise campaigns", () => {
    expect(priceWithCoupon(terms({}), 8_000, 30)).toBeNull();
    expect(priceWithCoupon(terms({ type: "free_delivery" }), 8_000, 0)).toBeNull();
    expect(priceWithCoupon(terms({ type: "random" }), 8_000, 0)).toBeNull();
  });
  it("never goes below zero", () => {
    expect(priceWithCoupon(terms({ type: "fixed", value: 99_999 }), 8_000, 0)).toBe(0);
  });
});

describe("coupon wording", () => {
  it("headlines", () => {
    expect(couponHeadline({ type: "percent", value: 20 })).toBe("20% OFF");
    expect(couponHeadline({ type: "fixed", value: 1_000 })).toBe("Rs 1,000 OFF");
    expect(couponHeadline({ type: "free_delivery", value: 0 })).toBe("FREE DELIVERY");
    expect(couponHeadline({ type: "random", value: 0, range: [10, 60] })).toBe("SURPRISE 10–60% OFF");
  });
  it("conditions", () => {
    expect(couponConditions(terms({ minOrder: 10_000, maxDiscount: 5_000 }))).toEqual([
      "On orders over Rs 10,000",
      "Up to Rs 5,000 off",
      "Full-price items only",
      "One use per customer",
    ]);
  });
  it("normalises what customers type, and only accepts sensible codes", () => {
    expect(normaliseCode("  eid 20 ")).toBe("EID20");
    expect(CODE_RX.test("EID20")).toBe(true);
    expect(CODE_RX.test("ROSE-AB12CD")).toBe(true);
    expect(CODE_RX.test("AB")).toBe(false);
    expect(CODE_RX.test("BAD CODE!")).toBe(false);
  });
});
