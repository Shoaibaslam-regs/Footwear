import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { releaseStock, reserveStock } from "@/lib/server/stock";
import { resetDb } from "../setup/integration";

const products = async () => (await getDb()).collection("products");
const addShoe = async (slug: string, stock: Record<string, number>) =>
  (await products()).insertOne({ _id: new ObjectId(), slug, name: slug, status: "published", stock, soldOutSizes: [] });
const stockOf = async (slug: string) => (await (await products()).findOne({ slug }))!;

beforeEach(resetDb);

describe("stock", () => {
  it("reserving takes pairs, and the last pair marks the size sold out", async () => {
    await addShoe("heel", { "38": 2 });
    expect(await reserveStock([{ slug: "heel", size: 38, quantity: 2 }])).toEqual({ ok: true });
    const p = await stockOf("heel");
    expect(p.stock["38"]).toBe(0);
    expect(p.soldOutSizes).toContain(38);
  });

  it("releasing (a cancelled order) puts pairs back and clears sold out", async () => {
    await addShoe("heel", { "38": 1 });
    await reserveStock([{ slug: "heel", size: 38, quantity: 1 }]);
    await releaseStock([{ slug: "heel", size: 38, quantity: 1 }]);
    const p = await stockOf("heel");
    expect(p.stock["38"]).toBe(1);
    expect(p.soldOutSizes).not.toContain(38);
  });

  it("two orders for the last pair: only one gets it", async () => {
    await addShoe("heel", { "38": 1 });
    const [a, b] = await Promise.all([
      reserveStock([{ slug: "heel", size: 38, quantity: 1 }]),
      reserveStock([{ slug: "heel", size: 38, quantity: 1 }]),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
    expect((await stockOf("heel")).stock["38"]).toBe(0);
  });

  it("if one line can't be filled, the lines already taken are put back", async () => {
    await addShoe("heel", { "38": 3 });
    await addShoe("flat", { "39": 1 });
    const r = await reserveStock([
      { slug: "heel", size: 38, quantity: 2 },
      { slug: "flat", size: 39, quantity: 2 },
    ]);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Only 1 pair/);
    expect((await stockOf("heel")).stock["38"]).toBe(3);
  });

  it("sizes without a stock number are unlimited", async () => {
    await addShoe("heel", {});
    expect(await reserveStock([{ slug: "heel", size: 40, quantity: 9 }])).toEqual({ ok: true });
  });
});
