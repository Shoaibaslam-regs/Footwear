import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { getOrderById, markOrderViewed, unviewedOrderCount } from "@/lib/server/orders";
import { resetDb } from "../setup/integration";

beforeEach(resetDb);

describe("unviewed orders", () => {
  it("counts orders no admin has opened, and opening one marks it viewed once", async () => {
    const col = (await getDb()).collection("orders");
    const base = { status: "pending", userId: new ObjectId(), history: [], items: [], createdAt: new Date(), updatedAt: new Date("2026-01-01") };
    const a = new ObjectId();
    await col.insertMany([
      { _id: a, number: "EL-NEW001", ...base },
      { _id: new ObjectId(), number: "EL-NEW002", ...base },
      { _id: new ObjectId(), number: "EL-OLD001", ...base, viewedAt: new Date() },
    ]);
    expect(await unviewedOrderCount()).toBe(2);
    expect(await markOrderViewed(a.toHexString())).toBe(true);
    expect(await markOrderViewed(a.toHexString())).toBe(false); // already viewed: no second write
    expect(await unviewedOrderCount()).toBe(1);
    const o = await getOrderById(a.toHexString());
    expect(o?.viewedAt).toBeTruthy();
    expect(o?.updatedAt).toBe(new Date("2026-01-01").toISOString()); // viewing isn't a change
    expect(await markOrderViewed("not-an-id")).toBe(false);
  });
});
