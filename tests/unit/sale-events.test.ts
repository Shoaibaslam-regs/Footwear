import { describe, expect, it } from "vitest";
import { applyCoupon } from "@/lib/coupons";
import { bestSaleFor, countdown, livePrice, nextSaleChange, saleState, upToPercent, type SaleEvent } from "@/lib/sale-events";

const T0 = Date.parse("2026-11-11T00:00:00+05:00");
const T1 = Date.parse("2026-11-12T23:59:59+05:00");

const sale = (over: Partial<SaleEvent> = {}): SaleEvent => ({
  id: "s1",
  name: "11.11 Sale",
  tag: "11.11",
  headline: "",
  startsAt: new Date(T0).toISOString(),
  endsAt: new Date(T1).toISOString(),
  scope: "all",
  percent: 20,
  categories: [],
  items: {},
  countdown: true,
  teaser: true,
  allowCoupons: false,
  stoppedAt: null,
  ...over,
});
const heel = { slug: "aurelia", category: "heels", price: 150_000, ownPercent: 0 };
const during = T0 + 3_600_000;

describe("sale price rule", () => {
  it("applies only while the sale is live, to the second", () => {
    expect(livePrice(heel, [sale()], T0 - 1).price).toBe(150_000);
    expect(livePrice(heel, [sale()], T0).price).toBe(120_000);
    expect(livePrice(heel, [sale()], T1 - 1).price).toBe(120_000);
    expect(livePrice(heel, [sale()], T1).price).toBe(150_000);
  });

  it("shows the normal price struck through and names the sale", () => {
    expect(livePrice(heel, [sale()], during)).toMatchObject({ price: 120_000, compareAt: 150_000, discountPercent: 20, sale: { id: "s1", tag: "11.11" } });
  });

  it("the bigger discount wins, never both added", () => {
    // Listing's own 50% beats the sale's 20%: no sale label.
    const own = livePrice({ ...heel, ownPercent: 50 }, [sale()], during);
    expect(own).toMatchObject({ price: 75_000, discountPercent: 50 });
    expect(own.sale).toBeUndefined();
    // Sale's 20% beats the listing's own 10%.
    expect(livePrice({ ...heel, ownPercent: 10 }, [sale()], during)).toMatchObject({ price: 120_000, discountPercent: 20, sale: { id: "s1" } });
    // After the sale, the listing's own discount comes back.
    expect(livePrice({ ...heel, ownPercent: 10 }, [sale()], T1 + 1)).toMatchObject({ price: 135_000, discountPercent: 10 });
  });

  it("covers the whole store, some categories, or hand-picked shoes", () => {
    const flat = { slug: "lucia", category: "flats", price: 100_000, ownPercent: 0 };
    const cats = sale({ scope: "categories", percent: 30, categories: ["heels"] });
    expect(livePrice(heel, [cats], during).price).toBe(105_000);
    expect(livePrice(flat, [cats], during).price).toBe(100_000);
    const picked = sale({ scope: "items", items: { aurelia: 40, lucia: 25 } });
    expect(livePrice(heel, [picked], during).price).toBe(90_000);
    expect(livePrice(flat, [picked], during).price).toBe(75_000);
    expect(livePrice({ ...heel, slug: "other" }, [picked], during).price).toBe(150_000);
  });

  it("stopping early ends it at once; overlapping sales give the biggest percent", () => {
    expect(livePrice(heel, [sale({ stoppedAt: new Date(during).toISOString() })], during + 1).price).toBe(150_000);
    const big = sale({ id: "s2", percent: 35 });
    expect(bestSaleFor([sale(), big], heel, during)?.event.id).toBe("s2");
  });

  it("coupons: sale pairs count as on sale unless the sale allows coupons", () => {
    const blocked = livePrice(heel, [sale()], during);
    const allowed = livePrice(heel, [sale({ allowCoupons: true })], during);
    expect(blocked.couponPercent).toBe(20);
    expect(allowed.couponPercent).toBe(0);
    const terms = { code: "EXTRA10", type: "percent" as const, value: 10, maxDiscount: null, maxPairs: null, minOrder: null, fullPriceOnly: true, startsAt: null, endsAt: null, perCustomer: 1 };
    const line = (p: typeof blocked) => [{ unitPrice: p.price, quantity: 1, discountPercent: p.couponPercent }];
    expect(applyCoupon(terms, line(blocked), 0).ok).toBe(false);
    expect(applyCoupon(terms, line(allowed), 0)).toMatchObject({ ok: true, itemDiscount: 12_000 });
  });

  it("knows its state, its 'up to' percent and when prices next change", () => {
    expect(saleState(sale(), T0 - 1)).toBe("scheduled");
    expect(saleState(sale(), during)).toBe("live");
    expect(saleState(sale(), T1)).toBe("ended");
    expect(upToPercent(sale({ scope: "items", items: { a: 15, b: 40 } }), [{ slug: "a", category: "heels" }, { slug: "b", category: "flats" }])).toBe(40);
    expect(nextSaleChange([sale()], T0 - 10)).toBe(T0);
    expect(nextSaleChange([sale()], during)).toBe(T1);
    expect(nextSaleChange([sale()], T1 + 1)).toBeNull();
    expect(countdown(90_061_000)).toBe("1d 01:01:01");
  });
});
