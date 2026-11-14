import "server-only";
import { ObjectId } from "mongodb";
import type { CartItem } from "../cart-data";
import { categoryLabel, productHref, type Listing } from "../products";
import type { SaleEvent } from "../sale-events";
import { listingPrice, salePricingNow } from "./sale-events";
import type { WishItem } from "../store-types";
import { getDb } from "./db";
import { getPublishedProducts } from "./products";

/** One document per account. Only references are stored; details come from listings. */
export type CartDoc = {
  _id: ObjectId; // = user id
  bag: { slug: string; size: number; quantity: number; addedAt: Date }[];
  wishlist: { slug: string; addedAt: Date }[];
  /** Coupon code the customer applied (checked again when the order is placed). */
  coupon?: string | null;
  updatedAt: Date;
};

export const MAX_QTY = 10;
export const MAX_LINES = 30;
export const MAX_WISH = 200;

export type AccountCart = { bag: CartItem[]; wishlist: WishItem[] };
export const EMPTY_CART: AccountCart = { bag: [], wishlist: [] };

export const lineIdOf = (slug: string, size: number) => `${slug}--eu-${size}`;

export const carts = async () => (await getDb()).collection<CartDoc>("carts");

type Pricing = { events: SaleEvent[]; now: number };

function toCartItem(p: Listing, size: number, quantity: number, pricing: Pricing): CartItem {
  const soldOut = p.soldOutSizes.includes(size);
  // Priced with live sales and the real clock (lib/sale-events.ts), as checkout will.
  const live = listingPrice(p, pricing);
  return {
    id: lineIdOf(p.slug, size),
    href: productHref(p),
    badge: p.badge || "Limited Edition",
    collection: categoryLabel(p.category),
    name: p.name,
    drawerName: p.name,
    price: live.price,
    discountPercent: live.discountPercent,
    couponPercent: live.couponPercent,
    ...(live.sale ? { sale: { name: live.sale.name, tag: live.sale.tag } } : {}),
    material: p.material,
    size: `EU ${size}`,
    color: p.material,
    drawerColor: p.material,
    colorDot: "bg-secondary",
    profile: p.spec || "Regular Fit",
    stockNote: soldOut ? "This size has just sold out" : "In stock",
    stockNoteClass: soldOut ? "text-error" : "text-on-surface-variant",
    stockDotClass: soldOut ? "bg-error" : "bg-primary",
    packaging: { title: "Ŕose Atelier Gift Box:", text: "Comes with a silk shoe bag with our logo." },
    quantity,
    image: p.image,
    alt: p.alt,
    thumb: p.image,
    thumbAlt: p.alt,
  };
}

const toWishItem = (p: Listing, pricing: Pricing): WishItem => ({
  id: p.slug,
  name: p.name,
  price: listingPrice(p, pricing).price,
  image: p.image,
  alt: p.alt,
  href: productHref(p),
  detail: p.material,
});

/** The account's bag and wishlist with current names, prices and photos. */
export async function hydrateCart(doc: Pick<CartDoc, "bag" | "wishlist"> | null): Promise<AccountCart> {
  if (!doc) return EMPTY_CART;
  const [listings, pricing] = await Promise.all([getPublishedProducts(), salePricingNow()]);
  const catalogue = new Map(listings.map((p) => [p.slug, p]));
  return {
    // Unpublished or deleted listings simply drop out.
    bag: doc.bag.flatMap((l) => {
      const p = catalogue.get(l.slug);
      return p && p.sizes.includes(l.size) ? [toCartItem(p, l.size, l.quantity, pricing)] : [];
    }),
    wishlist: doc.wishlist.flatMap((w) => {
      const p = catalogue.get(w.slug);
      return p ? [toWishItem(p, pricing)] : [];
    }),
  };
}

export async function getAccountCart(userId: string): Promise<AccountCart> {
  if (!ObjectId.isValid(userId)) return EMPTY_CART;
  return hydrateCart(await (await carts()).findOne({ _id: new ObjectId(userId) }));
}
