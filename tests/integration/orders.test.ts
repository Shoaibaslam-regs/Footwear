import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { getOrderById, insertOrder, listOrders, queuePositions, updateOrder } from "@/lib/server/orders";
import { consumeResetToken, createResetToken, peekResetToken } from "@/lib/server/password-reset";
import type { OrderStatus } from "@/lib/orders";
import { resetDb } from "../setup/integration";

beforeEach(resetDb);

const base = {
  userId: new ObjectId(),
  customer: { name: "Ayesha", email: "a@example.com", phone: "03001234567" },
  address: { line1: "1", line2: "", city: "Karachi", postalCode: "1", country: "PK" },
  items: [],
  listTotal: 1000,
  discountTotal: 0,
  shippingFee: 0,
  total: 1000,
  delivery: { id: "std", name: "Standard" },
  payment: { method: "cod" as const, status: "pending" as const, reference: "" },
  trackingNumber: "",
};
/** An order placed `hoursAgo` hours ago with this status. */
async function order(status: OrderStatus, hoursAgo: number) {
  const o = await insertOrder({ ...base, status });
  const at = new Date(Date.now() - hoursAgo * 3_600_000);
  await (await getDb()).collection("orders").updateOne({ _id: new ObjectId(o.id) }, { $set: { createdAt: at, updatedAt: at } });
  return o;
}

describe("order queue (first come, first served)", () => {
  it("orders still to be sent come first, oldest at the top; sent and finished ones follow, newest first", async () => {
    const newest = await order("pending", 1);
    const oldest = await order("confirmed", 50);
    const middle = await order("processing", 20);
    const shippedOld = await order("shipped", 60);
    const deliveredNew = await order("delivered", 2);
    const list = await listOrders();
    expect(list.map((o) => o.id)).toEqual([oldest.id, middle.id, newest.id, deliveredNew.id, shippedOld.id]);
  });

  it("queue numbers count only waiting orders, 1 = oldest", async () => {
    const a = await order("pending", 10);
    const b = await order("pending", 5);
    const sent = await order("shipped", 20);
    const { positions, total } = await queuePositions();
    expect(total).toBe(2);
    expect(positions.get(a.id)).toBe(1);
    expect(positions.get(b.id)).toBe(2);
    expect(positions.has(sent.id)).toBe(false);
  });

  it("a status filter and plain newest-first still work", async () => {
    const a = await order("pending", 10);
    const b = await order("pending", 5);
    await order("delivered", 1);
    expect((await listOrders({ status: "pending" })).map((o) => o.id)).toEqual([a.id, b.id]);
    expect((await listOrders({ sort: "newest" }))[0].status).toBe("delivered");
  });
});

describe("order updates", () => {
  it("two admins at once: the second status change is refused", async () => {
    const o = await order("pending", 1);
    const event = { kind: "status" as const, text: "Confirmed", by: "admin" };
    const [first, second] = await Promise.all([
      updateOrder(o.id, { status: "confirmed" }, event, "pending"),
      updateOrder(o.id, { status: "cancelled" }, event, "pending"),
    ]);
    expect([first, second].filter(Boolean)).toHaveLength(1);
  });

  it("an expected delivery date is saved on the order", async () => {
    const o = await order("pending", 1);
    await updateOrder(o.id, { eta: { from: "2026-11-16", to: "2026-11-17", setAt: new Date().toISOString() } }, { kind: "note", text: "Expected delivery", by: "admin" });
    expect((await getOrderById(o.id))?.eta).toMatchObject({ from: "2026-11-16", to: "2026-11-17" });
  });
});

describe("password reset links", () => {
  it("work once, and only the hash is stored", async () => {
    const userId = new ObjectId();
    const token = (await createResetToken(userId))!;
    expect(token).toBeTruthy();
    expect(JSON.stringify(await (await getDb()).collection("password_resets").find().toArray())).not.toContain(token);
    expect(await peekResetToken(token)).toBe(true);
    expect((await consumeResetToken(token))?.toHexString()).toBe(userId.toHexString());
    expect(await consumeResetToken(token)).toBeNull();
    expect(await peekResetToken("made-up-token")).toBe(false);
  });

  it("at most 3 links per account per hour", async () => {
    const userId = new ObjectId();
    for (let i = 0; i < 3; i++) expect(await createResetToken(userId)).toBeTruthy();
    expect(await createResetToken(userId)).toBeNull();
  });
});
