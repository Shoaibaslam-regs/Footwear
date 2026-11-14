import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getPublishedProducts } from "@/lib/server/products";
import { hydrateCart } from "@/lib/server/carts";
import { getSaleEvents, saleEvents, saleUpTo, salePricingNow, listingPrice } from "@/lib/server/sale-events";
import { resetDb } from "../setup/integration";

/** Two listings of our own (the one-time seed doesn't run again after a reset). */
beforeEach(async () => {
  await resetDb();
  const db = (await saleEvents()).db;
  const base = { description: "", image: "/x.jpg", imageKey: "", alt: "", gallery: [], badge: "", soldOutSizes: [], stock: {}, otherSales: 0, newArrival: false, bestSeller: false, status: "published", createdAt: new Date(), updatedAt: new Date() };
  await db.collection("products").insertMany([
    { ...base, _id: new ObjectId(), slug: "aurelia", name: "Aurelia", category: "heels", spec: "95mm", material: "Satin", price: 150_000, discountPercent: 0, sizes: [38, 39] },
    { ...base, _id: new ObjectId(), slug: "lucia", name: "Lucia", category: "flats", spec: "Flat", material: "Leather", price: 100_000, discountPercent: 0, sizes: [37] },
  ]);
});

const H = 3_600_000;
async function addSale(over: Partial<Parameters<Awaited<ReturnType<typeof saleEvents>>["insertOne"]>[0]> = {}) {
  const now = Date.now();
  await (await saleEvents()).insertOne({
    _id: new ObjectId(),
    name: "11.11 Sale",
    tag: "11.11",
    headline: "",
    startsAt: new Date(now - H),
    endsAt: new Date(now + H),
    scope: "all",
    percent: 20,
    categories: [],
    items: {},
    countdown: true,
    teaser: true,
    allowCoupons: false,
    stoppedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  });
}
/** A full-price published shoe and one of its sizes. */
async function shoe() {
  const p = (await getPublishedProducts()).find((l) => l.discountPercent === 0 && l.sizes.length)!;
  return { p, line: { slug: p.slug, size: p.sizes[0], quantity: 2, addedAt: new Date() } };
}

describe("sale events on the server", () => {
  it("a live sale prices the bag (what checkout charges), tagged with the sale", async () => {
    const { p, line } = await shoe();
    await addSale();
    const { bag } = await hydrateCart({ bag: [line], wishlist: [] });
    expect(bag[0]).toMatchObject({ price: Math.round(p.price * 0.8), discountPercent: 20, couponPercent: 20, sale: { tag: "11.11" } });
  });

  it("sales not yet started, already ended or stopped early don't change prices", async () => {
    const { p, line } = await shoe();
    const now = Date.now();
    await addSale({ startsAt: new Date(now + H), endsAt: new Date(now + 2 * H) });
    await addSale({ startsAt: new Date(now - 2 * H), endsAt: new Date(now - 1000) });
    await addSale({ stoppedAt: new Date(now - 1000) });
    const { bag } = await hydrateCart({ bag: [line], wishlist: [] });
    expect(bag[0]).toMatchObject({ price: p.price, discountPercent: 0 });
    expect(bag[0].sale).toBeUndefined();
    // Stopped sales leave the storefront schedule altogether.
    expect((await getSaleEvents()).map((e) => e.stoppedAt)).toEqual([null, null]);
  });

  it("only the chosen category or shoes, and a sale that allows coupons counts as full price for them", async () => {
    const { p, line } = await shoe();
    const other = (await getPublishedProducts()).find((l) => l.category !== p.category)!;
    await addSale({ scope: "categories", categories: [other.category], percent: 30 });
    expect((await hydrateCart({ bag: [line], wishlist: [] })).bag[0].price).toBe(p.price);
    await addSale({ scope: "items", percent: 0, items: { [p.slug]: 40 }, allowCoupons: true });
    const { bag } = await hydrateCart({ bag: [line], wishlist: [] });
    expect(bag[0]).toMatchObject({ price: Math.round(p.price * 0.6), discountPercent: 40, couponPercent: 0 });
  });

  it("the listing's own bigger discount wins, and 'up to' is worked out from the shoes covered", async () => {
    const { p } = await shoe();
    await addSale({ scope: "items", percent: 0, items: { [p.slug]: 15 } });
    const pricing = await salePricingNow();
    expect(listingPrice({ ...p, discountPercent: 50 }, pricing)).toMatchObject({ discountPercent: 50 });
    expect(listingPrice(p, pricing)).toMatchObject({ discountPercent: 15 });
    expect(Object.values(await saleUpTo())).toEqual([15]);
  });
});
