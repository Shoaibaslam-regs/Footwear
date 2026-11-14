import "server-only";
import { ObjectId } from "mongodb";
import { cacheLife, cacheTag, io } from "next/cache";
import type { ProductCategory } from "../products";
import { livePrice, upToPercent, type LivePrice, type SaleEvent, type SaleScope } from "../sale-events";
import { getPublishedProducts } from "./products";
import { getDb } from "./db";

/** Cache tag for sale events: every admin change calls updateTag(SALE_EVENTS_TAG). */
export const SALE_EVENTS_TAG = "sale-events";

export type SaleEventDoc = {
  _id: ObjectId;
  name: string;
  tag: string;
  headline: string;
  startsAt: Date;
  endsAt: Date;
  scope: SaleScope;
  percent: number;
  categories: ProductCategory[];
  items: Record<string, number>;
  countdown: boolean;
  teaser: boolean;
  allowCoupons: boolean;
  stoppedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export const saleEvents = async () => (await getDb()).collection<SaleEventDoc>("sale_events");

export const toSaleEvent = (d: SaleEventDoc): SaleEvent => ({
  id: d._id.toHexString(),
  name: d.name,
  tag: d.tag,
  headline: d.headline,
  startsAt: d.startsAt.toISOString(),
  endsAt: d.endsAt.toISOString(),
  scope: d.scope,
  percent: d.percent,
  categories: d.categories ?? [],
  items: d.items ?? {},
  countdown: d.countdown,
  teaser: d.teaser,
  allowCoupons: d.allowCoupons,
  stoppedAt: d.stoppedAt ? d.stoppedAt.toISOString() : null,
});

/**
 * Sales the storefront and the price rule need: every one that wasn't stopped,
 * most recent first (cached; the caller decides what is live with the clock).
 * Cached without reading the time, so pre-built pages can include it.
 */
export async function getSaleEvents(): Promise<SaleEvent[]> {
  "use cache";
  cacheTag(SALE_EVENTS_TAG);
  cacheLife("days");
  const docs = await (await saleEvents()).find({ stoppedAt: null }).sort({ startsAt: -1 }).limit(30).toArray();
  return docs.map(toSaleEvent);
}

/** Every sale for the admin list, newest first (uncached). */
export async function listSaleEvents(): Promise<SaleEvent[]> {
  const docs = await (await saleEvents()).find({}).sort({ startsAt: -1 }).toArray();
  return docs.map(toSaleEvent);
}

/** The admin list with the time its statuses are worked out at. */
export async function listSaleEventsNow(): Promise<{ rows: SaleEvent[]; now: number }> {
  await io(); // statuses depend on the time
  return { rows: await listSaleEvents(), now: Date.now() };
}

export async function getSaleEvent(id: string): Promise<SaleEvent | null> {
  if (!ObjectId.isValid(id)) return null;
  const d = await (await saleEvents()).findOne({ _id: new ObjectId(id) });
  return d ? toSaleEvent(d) : null;
}

/**
 * For money paths (bag, checkout, orders): the sales with the real time.
 * The list is cached, but every admin change refreshes it, and liveness is
 * decided here with the clock, so an order at 11:59:58 pm gets the sale and
 * one at 12:00:01 am doesn't.
 */
export async function salePricingNow(): Promise<{ events: SaleEvent[]; now: number }> {
  await io(); // reads the current time
  return { events: await getSaleEvents(), now: Date.now() };
}

/**
 * "Up to X%" for each sale, over the published listings it covers (0 when it
 * covers none). Cached data only, so pre-built pages can show it.
 */
export async function saleUpTo(): Promise<Record<string, number>> {
  const [events, listings] = await Promise.all([getSaleEvents(), getPublishedProducts()]);
  return Object.fromEntries(events.map((e) => [e.id, upToPercent(e, listings)]));
}

/** livePrice for a listing, with the given sales and time. */
export const listingPrice = (
  p: { slug: string; category: string; price: number; discountPercent: number },
  pricing: { events: SaleEvent[]; now: number },
): LivePrice => livePrice({ slug: p.slug, category: p.category, price: p.price, ownPercent: p.discountPercent }, pricing.events, pricing.now);
