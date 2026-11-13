import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { getAttention, IN_TRANSIT_DAYS, pkToday, QUEUE_URGENT_DAYS } from "@/lib/server/attention";
import { listOrders } from "@/lib/server/orders";
import type { OrderStatus } from "@/lib/orders";
import { resetDb } from "../setup/integration";

const DAY = 86_400_000;
let seq = 0;
async function order(o: { status: OrderStatus; daysAgo: number; eta?: { from: string; to: string }; payment?: "pending" | "paid"; method?: string; statusDaysAgo?: number; total?: number }) {
  const at = new Date(Date.now() - o.daysAgo * DAY);
  const statusAt = new Date(Date.now() - (o.statusDaysAgo ?? o.daysAgo) * DAY);
  await (await getDb()).collection("orders").insertOne({
    _id: new ObjectId(),
    number: `T-${++seq}`,
    userId: new ObjectId(),
    status: o.status,
    total: o.total ?? 10_000,
    payment: { method: o.method ?? "cod", status: o.payment ?? "pending", reference: "" },
    history: [{ kind: "status", text: o.status, by: "admin", at: statusAt }],
    ...(o.eta ? { eta: { ...o.eta, setAt: at.toISOString() } } : {}),
    createdAt: at,
    updatedAt: statusAt,
  });
}
const plus = (days: number) => pkToday(Date.now() + days * DAY);
const keys = async () => (await getAttention()).map((i) => i.key);

beforeEach(resetDb);

describe("Needs attention", () => {
  it("with nothing waiting, only setup items show", async () => {
    delete process.env.ADMIN_SECRET;
    const items = await getAttention();
    expect(items.every((i) => i.tone === "setup")).toBe(true);
    expect(items.map((i) => i.key)).toEqual(expect.arrayContaining(["delivery", "gate"]));
  });

  it("the queue: count and the oldest's wait, urgent after 3 days", async () => {
    await order({ status: "pending", daysAgo: 1 });
    await order({ status: "confirmed", daysAgo: 0.2 });
    let q = (await getAttention()).find((i) => i.key === "queue")!;
    expect(q.title).toBe("2 orders waiting to be sent");
    expect(q.hint).toMatch(/has waited 1 day/);
    expect(q.tone).toBe("todo");
    await order({ status: "processing", daysAgo: QUEUE_URGENT_DAYS + 1 });
    q = (await getAttention()).find((i) => i.key === "queue")!;
    expect(q.tone).toBe("urgent");
    expect(q.hint).toMatch(/has waited 4 days/);
  });

  it("orders past their expected date are urgent; waiting ones without a date are listed", async () => {
    await order({ status: "confirmed", daysAgo: 5, eta: { from: plus(-3), to: plus(-1) } }); // late
    await order({ status: "shipped", daysAgo: 4, statusDaysAgo: 1, eta: { from: plus(-2), to: plus(-2) } }); // late, on the way
    await order({ status: "pending", daysAgo: 1, eta: { from: plus(1), to: plus(2) } }); // fine
    await order({ status: "pending", daysAgo: 1 }); // no date
    await order({ status: "delivered", daysAgo: 9, eta: { from: plus(-8), to: plus(-7) } }); // finished: never late
    const items = await getAttention();
    expect(items.find((i) => i.key === "late")).toMatchObject({ tone: "urgent", title: "2 orders are past the expected delivery date" });
    expect(items.find((i) => i.key === "no-eta")?.title).toBe("1 waiting order has no expected delivery date");
    // The links behind them show the same orders.
    expect(await listOrders({ eta: { lateBefore: pkToday() } })).toHaveLength(2);
    expect(await listOrders({ eta: { missing: true } })).toHaveLength(1);
  });

  it("parcels on the way for over a week are urgent", async () => {
    await order({ status: "shipped", daysAgo: 12, statusDaysAgo: IN_TRANSIT_DAYS + 1 });
    await order({ status: "out_for_delivery", daysAgo: 3, statusDaysAgo: 1 });
    expect((await getAttention()).find((i) => i.key === "stuck")).toMatchObject({ tone: "urgent", title: "1 parcel has been on the way for over 7 days" });
  });

  it("delivered COD orders not marked paid show the money to collect, and aren't counted twice", async () => {
    await order({ status: "delivered", daysAgo: 3, total: 12_500 });
    await order({ status: "delivered", daysAgo: 3, payment: "paid" });
    await order({ status: "pending", daysAgo: 1, method: "bank", total: 8_000 });
    const items = await getAttention();
    expect(items.find((i) => i.key === "cod")?.hint).toMatch(/PKR 12,500 to collect/);
    expect(items.find((i) => i.key === "payment")?.title).toBe("PKR 8,000 awaiting payment");
  });

  it("urgent items come first, setup last", async () => {
    await order({ status: "pending", daysAgo: 0.5 });
    await order({ status: "confirmed", daysAgo: 6, eta: { from: plus(-2), to: plus(-1) } });
    const tones = (await getAttention()).map((i) => i.tone);
    expect(tones).toEqual([...tones].sort((a, b) => ["urgent", "todo", "setup"].indexOf(a) - ["urgent", "todo", "setup"].indexOf(b)));
    expect(tones[0]).toBe("urgent");
    expect(await keys()).toContain("confirm");
  });
});
