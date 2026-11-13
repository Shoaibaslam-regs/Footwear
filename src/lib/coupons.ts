/**
 * Coupon rules shared by the browser (live checkout totals) and the server
 * (which recomputes everything in placeOrder and never trusts the browser).
 */

export const couponTypes = ["percent", "fixed", "free_delivery", "random"] as const;
export type CouponType = (typeof couponTypes)[number];

export const couponTypeLabel: Record<CouponType, string> = {
  percent: "% off",
  fixed: "Amount off (PKR)",
  free_delivery: "Free delivery",
  random: "Surprise % (random for each customer)",
};

export const RANDOM_DEFAULT: [number, number] = [10, 60];

/** What a customer may know about a coupon (shown on the offer page and at checkout). */
export type CouponTerms = {
  code: string;
  type: CouponType;
  /** Percent (1–90) or PKR, depending on `type`. Unused for free delivery. */
  value: number;
  /** PKR cap for percent coupons (null = no cap). */
  maxDiscount: number | null;
  /**
   * Percent coupons: how many pairs the percent is taken off, the most expensive
   * eligible pairs first (the rest of the bag is full price). Null = the whole bag.
   */
  maxPairs?: number | null;
  /** Minimum items total in PKR (null = none). */
  minOrder: number | null;
  /** Only full-price items count (items already on sale are skipped). */
  fullPriceOnly: boolean;
  /** ISO dates, or null. */
  startsAt: string | null;
  endsAt: string | null;
  /** Uses allowed per customer. */
  perCustomer: number;
  /** Surprise campaigns: the lowest and highest percent a customer can get. */
  range?: [number, number] | null;
};

export type CouponLine = { unitPrice: number; quantity: number; discountPercent: number };

export type CouponResult =
  | { ok: true; itemDiscount: number; deliveryDiscount: number; eligibleTotal: number }
  | { ok: false; reason: string; eligibleTotal: number };

/** Normalises what customers type: trims, uppercases, drops spaces. */
export const normaliseCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");
export const CODE_RX = /^[A-Z0-9-]{3,24}$/;

const pkr = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

/** Discount for a bag. `fee` is the chosen delivery fee. */
export function applyCoupon(terms: CouponTerms, lines: CouponLine[], fee: number): CouponResult {
  // A surprise campaign is never used directly: each customer gets their own code from it.
  if (terms.type === "random") return { ok: false, reason: "Open your surprise card to get your own code.", eligibleTotal: 0 };
  const itemsTotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);
  const eligible = lines
    .filter((l) => !terms.fullPriceOnly || l.discountPercent === 0)
    .reduce((n, l) => n + l.unitPrice * l.quantity, 0);

  if (terms.minOrder && itemsTotal < terms.minOrder) {
    return { ok: false, reason: `Add ${pkr(terms.minOrder - itemsTotal)} more to use this code.`, eligibleTotal: eligible };
  }
  if (terms.type === "free_delivery") {
    if (fee <= 0) return { ok: false, reason: "Delivery is already free for this order.", eligibleTotal: eligible };
    return { ok: true, itemDiscount: 0, deliveryDiscount: fee, eligibleTotal: eligible };
  }
  if (eligible <= 0) {
    return {
      ok: false,
      reason: terms.fullPriceOnly ? "This code doesn't work on sale items." : "Your bag is empty.",
      eligibleTotal: 0,
    };
  }
  let off = terms.type === "percent" ? Math.round((discountBase(terms, lines) * terms.value) / 100) : terms.value;
  if (terms.type === "percent" && terms.maxDiscount) off = Math.min(off, terms.maxDiscount);
  off = Math.min(off, eligible);
  return { ok: true, itemDiscount: off, deliveryDiscount: 0, eligibleTotal: eligible };
}

/**
 * What a percent is taken off: every eligible pair, or with `maxPairs` only the
 * N most expensive eligible pairs (each pair counted once, so 3 × the same shoe
 * is 3 pairs).
 */
export function discountBase(terms: Pick<CouponTerms, "fullPriceOnly" | "maxPairs">, lines: CouponLine[]): number {
  const pairs = lines
    .filter((l) => !terms.fullPriceOnly || l.discountPercent === 0)
    .flatMap((l) => Array.from({ length: Math.max(0, l.quantity) }, () => l.unitPrice));
  if (!terms.maxPairs || terms.maxPairs <= 0) return pairs.reduce((n, p) => n + p, 0);
  return pairs
    .sort((a, b) => b - a)
    .slice(0, terms.maxPairs)
    .reduce((n, p) => n + p, 0);
}

/** Price of one item after the coupon (for "with coupon" prices on the offer page). */
export function priceWithCoupon(terms: CouponTerms, price: number, discountPercent: number): number | null {
  if (terms.type === "free_delivery" || terms.type === "random") return null;
  if (terms.fullPriceOnly && discountPercent > 0) return null;
  let off = terms.type === "percent" ? Math.round((price * terms.value) / 100) : terms.value;
  if (terms.type === "percent" && terms.maxDiscount) off = Math.min(off, terms.maxDiscount);
  return Math.max(0, price - Math.min(off, price));
}

/** Big headline for the offer card, e.g. "20% OFF", "Rs 1,000 OFF", "FREE DELIVERY". */
export function couponHeadline(t: Pick<CouponTerms, "type" | "value" | "range">): string {
  if (t.type === "random") return `SURPRISE ${t.range?.[0] ?? RANDOM_DEFAULT[0]}–${t.range?.[1] ?? RANDOM_DEFAULT[1]}% OFF`;
  if (t.type === "percent") return `${t.value}% OFF`;
  if (t.type === "fixed") return `${pkr(t.value)} OFF`;
  return "FREE DELIVERY";
}

/** Day and month only (no year anywhere on the storefront). */
export const dayMonth = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: "Asia/Karachi" });

/** One line of conditions, e.g. "On orders over Rs 10,000 · Up to Rs 5,000 off · Full-price items only". */
export function couponConditions(t: CouponTerms): string[] {
  const out: string[] = [];
  if (t.minOrder) out.push(`On orders over ${pkr(t.minOrder)}`);
  if ((t.type === "percent" || t.type === "random") && t.maxPairs) out.push(t.maxPairs === 1 ? "On 1 pair" : `On up to ${t.maxPairs} pairs`);
  if ((t.type === "percent" || t.type === "random") && t.maxDiscount) out.push(`Up to ${pkr(t.maxDiscount)} off`);
  if (t.type !== "free_delivery" && t.fullPriceOnly) out.push("Full-price items only");
  if (t.type === "random") out.push("One card per customer");
  else out.push(t.perCustomer === 1 ? "One use per customer" : `Up to ${t.perCustomer} uses per customer`);
  return out;
}

/** What "My Coupons" and the bag/checkout strip show for one coupon (no code: the scratch card reveals it). */
export type OfferSummary = {
  /** Link target: /offers/<code> (a surprise campaign's code until the customer gets their card). */
  code: string;
  /** The discount, e.g. "25% OFF". Null until this customer has scratched the card: it stays hidden. */
  headline: string | null;
  conditions: string;
  validUntil: string | null;
  surprise: boolean;
};
