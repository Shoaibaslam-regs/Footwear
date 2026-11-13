import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { cardFor, claimCoupon, coupons, releaseCoupon, unavailableReason, type CouponDoc } from "@/lib/server/coupons";
import { resetDb } from "../setup/integration";

const user = () => new ObjectId().toHexString();
async function addCoupon(c: Partial<CouponDoc>): Promise<CouponDoc> {
  const now = new Date();
  const doc: CouponDoc = {
    _id: new ObjectId(),
    code: "EID20",
    type: "percent",
    value: 20,
    maxDiscount: null,
    minOrder: null,
    fullPriceOnly: true,
    startsAt: null,
    endsAt: null,
    maxUses: null,
    perCustomer: 1,
    active: true,
    uses: 0,
    createdAt: now,
    updatedAt: now,
    ...c,
  };
  await (await coupons()).insertOne(doc);
  return doc;
}
const fresh = async (c: CouponDoc) => (await (await coupons()).findOne({ _id: c._id }))!;

beforeEach(resetDb);

describe("coupons", () => {
  it("one use per customer: the second claim is refused, and cancelling gives it back", async () => {
    const c = await addCoupon({});
    const u = user();
    expect(await claimCoupon(c, u)).toBeNull();
    expect(await unavailableReason(await fresh(c), u)).toBe("You have already used this code.");
    expect(await claimCoupon(await fresh(c), u)).toBe("You have already used this code.");
    expect((await fresh(c)).uses).toBe(1);
    await releaseCoupon(c.code, u);
    expect((await fresh(c)).uses).toBe(0);
    expect(await unavailableReason(await fresh(c), u)).toBeNull();
  });

  it("the total limit holds even when many customers claim at once", async () => {
    const c = await addCoupon({ maxUses: 3 });
    const results = await Promise.all(Array.from({ length: 8 }, () => claimCoupon(c, user())));
    expect(results.filter((r) => r === null)).toHaveLength(3);
    expect((await fresh(c)).uses).toBe(3);
  });

  it("paused, expired and not-started codes explain why", async () => {
    const u = user();
    expect(await unavailableReason(await addCoupon({ code: "OFF1", active: false }), u)).toBe("This code is not valid.");
    expect(await unavailableReason(await addCoupon({ code: "OLD1", endsAt: new Date(Date.now() - 86_400_000) }), u)).toBe("This code has expired.");
    expect(await unavailableReason(await addCoupon({ code: "SOON1", startsAt: new Date(Date.now() + 86_400_000) }), u)).toBe("This code is not active yet.");
    expect(await unavailableReason(null, u)).toBe("This code is not valid.");
  });

  it("surprise cards: one per customer, never re-rolled, within the range, and only for their owner", async () => {
    const campaign = await addCoupon({ code: "SURPRISE", type: "random", value: 0, minPercent: 10, maxPercent: 60, maxUses: 100 });
    const u = user();
    const [a, b] = await Promise.all([cardFor(campaign, u), cardFor(campaign, u)]);
    expect("card" in a && "card" in b).toBe(true);
    if (!("card" in a) || !("card" in b)) return;
    expect(a.card.code).toBe(b.card.code);
    expect(a.card.code).toMatch(/^ROSE-[2-9A-HJ-NP-Z]{6}$/);
    expect(a.card.value).toBeGreaterThanOrEqual(10);
    expect(a.card.value).toBeLessThanOrEqual(60);
    expect((await fresh(campaign)).uses).toBe(1);
    expect(await unavailableReason(a.card, u)).toBeNull();
    expect(await unavailableReason(a.card, user())).toBe("This code is not valid.");
    // The campaign code itself is never used directly.
    expect(await unavailableReason(campaign, u)).toMatch(/surprise card/);
  });

  it("a surprise card keeps its campaign's pair limit", async () => {
    const campaign = await addCoupon({ code: "SURPRISE2", type: "random", value: 0, minPercent: 10, maxPercent: 20, maxPairs: 1 });
    const r = await cardFor(campaign, user());
    if (!("card" in r)) throw new Error(r.error);
    expect(r.card.maxPairs).toBe(1);
  });

  it("a card stops working when its campaign is paused", async () => {
    const campaign = await addCoupon({ code: "SURPRISE", type: "random", value: 0, minPercent: 10, maxPercent: 20 });
    const u = user();
    const r = await cardFor(campaign, u);
    if (!("card" in r)) throw new Error(r.error);
    await (await coupons()).updateOne({ _id: campaign._id }, { $set: { active: false } });
    expect(await unavailableReason(r.card, u)).toBe("This code is not valid.");
  });
});
