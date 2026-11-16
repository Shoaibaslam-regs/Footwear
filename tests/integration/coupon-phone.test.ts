import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { phoneLimitReason, type CouponDoc } from "@/lib/server/coupons";
import { resetDb } from "../setup/integration";

beforeEach(resetDb);

const coupon = (over: Partial<CouponDoc> = {}) =>
  ({ _id: new ObjectId(), code: "WELCOME10", type: "percent", value: 10, perCustomer: 1, ...over }) as CouponDoc;
const order = async (userId: ObjectId, phoneKey: string, couponField: object, status = "pending") =>
  (await getDb()).collection("orders").insertOne({ number: `EL-${new ObjectId().toHexString().slice(-6)}`, userId, status, customer: { phoneKey }, coupon: couponField });

describe("one coupon per phone number, across accounts", () => {
  it("another account that used the coupon with this phone blocks it", async () => {
    const c = coupon();
    const me = new ObjectId().toHexString();
    expect(await phoneLimitReason(c, undefined, "03001234567", me)).toBeNull();
    await order(new ObjectId(), "03001234567", { code: "WELCOME10" });
    expect(await phoneLimitReason(c, undefined, "03001234567", me)).toMatch(/already been used with this phone/);
    // A different phone is fine.
    expect(await phoneLimitReason(c, undefined, "03111111111", me)).toBeNull();
  });

  it("cancelled orders don't count, and coupons allowing 2 uses allow 2", async () => {
    const me = new ObjectId().toHexString();
    await order(new ObjectId(), "03001234567", { code: "WELCOME10" }, "cancelled");
    expect(await phoneLimitReason(coupon(), undefined, "03001234567", me)).toBeNull();
    await order(new ObjectId(), "03001234567", { code: "WELCOME10" });
    expect(await phoneLimitReason(coupon({ perCustomer: 2 }), undefined, "03001234567", me)).toBeNull();
  });

  it("surprise cards: one card per campaign per phone, whichever account", async () => {
    const card = coupon({ code: "ROSE-ABC234" });
    const me = new ObjectId().toHexString();
    await order(new ObjectId(), "03001234567", { code: "ROSE-ZZZ999", campaign: "EID-SURPRISE" });
    expect(await phoneLimitReason(card, "EID-SURPRISE", "03001234567", me)).toMatch(/surprise card from this offer/);
    expect(await phoneLimitReason(card, "OTHER-CAMPAIGN", "03001234567", me)).toBeNull();
  });
});
