import { MAX_DISCOUNT, type ProductCategory } from "./products";

/**
 * Sale events ("11.11 Sale"): a discount over listings for a time window,
 * set up at /admin/sales. Listings themselves are never edited; the sale is a
 * layer on top while it is live, and prices go back by themselves after it.
 *
 * One rule decides a shoe's price at any moment (`livePrice`): the bigger of the
 * listing's own discount and the best live sale for it, never both added. The
 * server uses it with the real clock for the bag, checkout and the order; the
 * storefront uses it in the browser, so pre-built pages switch at the second.
 * (Internally "sale events", because `sales` already means units sold.)
 */

export const saleScopes = ["all", "categories", "items"] as const;
export type SaleScope = (typeof saleScopes)[number];
export const saleScopeLabel: Record<SaleScope, string> = {
  all: "Whole store",
  categories: "Some categories",
  items: "Hand-picked shoes",
};

/** A sale as the storefront and the price rule see it (dates as ISO strings, serialisable). */
export type SaleEvent = {
  id: string;
  /** "11.11 Sale" */
  name: string;
  /** Short tag on cards, e.g. "11.11". */
  tag: string;
  /** One line under the name, e.g. "On heels and bridal shoes". */
  headline: string;
  startsAt: string;
  endsAt: string;
  scope: SaleScope;
  /** Percent for "all" and "categories". */
  percent: number;
  categories: ProductCategory[];
  /** Hand-picked: listing slug → percent. */
  items: Record<string, number>;
  countdown: boolean;
  /** Show a "starts in…" bar before it begins. */
  teaser: boolean;
  /** Coupons may be used on sale-priced pairs too. */
  allowCoupons: boolean;
  /** Set when the admin stopped it early. */
  stoppedAt: string | null;
};

export type SaleState = "scheduled" | "live" | "ended";

/** How far ahead the "starts in…" teaser shows. */
export const TEASER_MS = 3 * 86_400_000;

export function saleState(e: Pick<SaleEvent, "startsAt" | "endsAt" | "stoppedAt">, now: number): SaleState {
  if (e.stoppedAt && Date.parse(e.stoppedAt) <= now) return "ended";
  if (now < Date.parse(e.startsAt)) return "scheduled";
  return now < Date.parse(e.endsAt) ? "live" : "ended";
}
export const isLive = (e: SaleEvent, now: number) => saleState(e, now) === "live";

/** The sale's percent for one listing (0 when the listing isn't part of it). */
export function salePercentFor(e: SaleEvent, p: { slug: string; category?: string }): number {
  const pct =
    e.scope === "all" ? e.percent : e.scope === "categories" ? (p.category && e.categories.includes(p.category as ProductCategory) ? e.percent : 0) : (e.items[p.slug] ?? 0);
  return Math.min(MAX_DISCOUNT, Math.max(0, Math.round(pct || 0)));
}

/** The best live sale for a listing, if any. Overlapping sales: the biggest percent wins. */
export function bestSaleFor(events: SaleEvent[], p: { slug: string; category?: string }, now: number): { event: SaleEvent; percent: number } | null {
  let best: { event: SaleEvent; percent: number } | null = null;
  for (const e of events) {
    if (!isLive(e, now)) continue;
    const percent = salePercentFor(e, p);
    if (percent > 0 && (!best || percent > best.percent)) best = { event: e, percent };
  }
  return best;
}

export type LivePrice = {
  /** What the customer pays per pair (PKR). */
  price: number;
  /** The normal price, when discounted. */
  compareAt?: number;
  /** The discount that applies (the listing's own, or the sale's). */
  discountPercent: number;
  /** Set when the sale's discount is the one that applies. */
  sale?: { id: string; name: string; tag: string; endsAt: string };
  /**
   * What coupon rules see as this pair's discount: 0 counts as full price. A
   * sale that allows coupons lets them on its pairs; otherwise sale pairs are
   * "on sale" for full-price-only coupons, like listing discounts.
   */
  couponPercent: number;
};

/**
 * The price of one listing right now. `price` is the listing's normal price
 * and `ownPercent` its own discount (0–90). The bigger discount wins; the two
 * are never added together.
 */
export function livePrice(
  p: { slug: string; category?: string; price: number; ownPercent: number },
  events: SaleEvent[],
  now: number,
): LivePrice {
  const own = Math.min(MAX_DISCOUNT, Math.max(0, p.ownPercent || 0));
  const best = bestSaleFor(events, p, now);
  const saleWins = !!best && best.percent > own;
  const pct = saleWins ? best!.percent : own;
  if (pct <= 0) return { price: p.price, discountPercent: 0, couponPercent: 0 };
  return {
    price: Math.round((p.price * (100 - pct)) / 100),
    compareAt: p.price,
    discountPercent: pct,
    ...(saleWins ? { sale: { id: best!.event.id, name: best!.event.name, tag: best!.event.tag, endsAt: best!.event.endsAt } } : {}),
    couponPercent: saleWins && best!.event.allowCoupons ? 0 : pct,
  };
}

/** "Up to 40% off": the biggest discount the sale gives on the listings it covers. */
export function upToPercent(e: SaleEvent, listings: { slug: string; category: string }[]): number {
  return listings.reduce((n, p) => Math.max(n, salePercentFor(e, p)), 0);
}

/** The next moment any sale starts or ends after `now` (to switch prices exactly then), or null. */
export function nextSaleChange(events: SaleEvent[], now: number): number | null {
  let next: number | null = null;
  for (const e of events) {
    for (const t of [Date.parse(e.startsAt), Date.parse(e.stoppedAt ?? e.endsAt), Date.parse(e.endsAt)]) {
      if (t > now && (next === null || t < next)) next = t;
    }
  }
  return next;
}

/** "12 Nov, 11:59 pm" in Pakistan time. */
export const saleTime = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });

/** "1d 04:22:10" / "04:22:10" until `ms`. */
export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(s / 86_400);
  const hms = [Math.floor((s % 86_400) / 3600), Math.floor((s % 3600) / 60), s % 60].map((n) => String(n).padStart(2, "0")).join(":");
  return d > 0 ? `${d}d ${hms}` : hms;
}
