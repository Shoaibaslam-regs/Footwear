import "server-only";
import { ObjectId } from "mongodb";
import type { CartItem } from "../cart-data";
import { categoryLabel, productHref, salePrice, type Listing } from "../products";
import type { WishItem } from "../store-types";
import { getDb } from "./db";
import { getPublishedProducts } from "./products";

/** One document per account. Only references are stored; details come from listings. */
export type CartDoc = {
  _id: ObjectId; // = user id
  bag: { slug: string; size: number; quantity: number; addedAt: Date }[];
  wishlist: { slug: string; addedAt: Date }[];
  updatedAt: Date;
};

export const MAX_QTY = 10;
export const MAX_LINES = 30;
export const MAX_WISH = 200;

export type AccountCart = { bag: CartItem[]; wishlist: WishItem[] };
export const EMPTY_CART: AccountCart = { bag: [], wishlist: [] };

export const lineIdOf = (slug: string, size: number) => `${slug}--eu-${size}`;

export const carts = async () => (await getDb()).collection<CartDoc>("carts");

function toCartItem(p: Listing, size: number, quantity: number): CartItem {
  const soldOut = p.soldOutSizes.includes(size);
  return {
    id: lineIdOf(p.slug, size),
    href: productHref(p),
    badge: p.badge || "Atelier Edition",
    collection: categoryLabel(p.category),
    name: p.name,
    drawerName: p.name,
    price: salePrice(p),
    material: p.material,
    size: `EU ${size}`,
    color: p.material,
    drawerColor: p.material,
    colorDot: "bg-secondary",
    profile: p.spec || "Atelier Fit",
    stockNote: soldOut ? "This size has just sold out" : "In stock",
    stockNoteClass: soldOut ? "text-error" : "text-on-surface-variant",
    stockDotClass: soldOut ? "bg-error" : "bg-primary",
    packaging: { title: "Maison ÉLORA Presentation Box:", text: "Includes a monogrammed silk dust pouch." },
    quantity,
    image: p.image,
    alt: p.alt,
    thumb: p.image,
    thumbAlt: p.alt,
  };
}

const toWishItem = (p: Listing): WishItem => ({
  id: p.slug,
  name: p.name,
  price: salePrice(p),
  image: p.image,
  alt: p.alt,
  href: productHref(p),
  detail: p.material,
});

/** The account's bag and wishlist with current names, prices and photos. */
export async function hydrateCart(doc: Pick<CartDoc, "bag" | "wishlist"> | null): Promise<AccountCart> {
  if (!doc) return EMPTY_CART;
  const catalogue = new Map((await getPublishedProducts()).map((p) => [p.slug, p]));
  return {
    // Unpublished or deleted listings simply drop out.
    bag: doc.bag.flatMap((l) => {
      const p = catalogue.get(l.slug);
      return p && p.sizes.includes(l.size) ? [toCartItem(p, l.size, l.quantity)] : [];
    }),
    wishlist: doc.wishlist.flatMap((w) => {
      const p = catalogue.get(w.slug);
      return p ? [toWishItem(p)] : [];
    }),
  };
}

export async function getAccountCart(userId: string): Promise<AccountCart> {
  if (!ObjectId.isValid(userId)) return EMPTY_CART;
  return hydrateCart(await (await carts()).findOne({ _id: new ObjectId(userId) }));
}
