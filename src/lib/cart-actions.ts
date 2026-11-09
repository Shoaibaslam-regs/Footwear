"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "./auth/dal";
import {
  carts,
  EMPTY_CART,
  getAccountCart,
  hydrateCart,
  lineIdOf,
  MAX_LINES,
  MAX_QTY,
  MAX_WISH,
  type AccountCart,
  type CartDoc,
} from "./server/carts";
import { getPublishedProduct } from "./server/products";
import { stockLeft } from "./products";

export type CartResult = { cart: AccountCart; signedIn: boolean; error?: string };

const slug = z.string().min(1).max(120).regex(/^[a-z0-9-]+$/);
const size = z.number().int().min(30).max(46);
const qty = z.number().int().min(1).max(MAX_QTY);

type Doc = Pick<CartDoc, "bag" | "wishlist">;

/**
 * Loads the signed-in account's cart, applies `change`, saves, and returns the
 * hydrated result. A change that returns a message is not saved, unless it
 * calls `save()` first (e.g. quantity capped at stock, with an explanation).
 */
async function mutate(
  change: (doc: Doc, save: () => Promise<void>) => Promise<string | void> | string | void,
): Promise<CartResult> {
  const user = await getCurrentUser();
  if (!user) return { cart: EMPTY_CART, signedIn: false, error: "Please log in first." };
  const col = await carts();
  const _id = new ObjectId(user.id);
  const doc = (await col.findOne({ _id })) ?? { _id, bag: [], wishlist: [], updatedAt: new Date() };
  const save = async () => {
    await col.updateOne({ _id }, { $set: { bag: doc.bag, wishlist: doc.wishlist, updatedAt: new Date() } }, { upsert: true });
  };
  const error = (await change(doc, save)) || undefined;
  if (!error) {
    await col.updateOne(
      { _id },
      { $set: { bag: doc.bag, wishlist: doc.wishlist, updatedAt: new Date() } },
      { upsert: true },
    );
  }
  return { cart: await hydrateCart(doc), signedIn: true, error };
}

/** The current cart, unchanged (for rejected requests). */
async function currentCart(error: string): Promise<CartResult> {
  const user = await getCurrentUser();
  if (!user) return { cart: EMPTY_CART, signedIn: false, error: "Please log in first." };
  return { cart: await getAccountCart(user.id), signedIn: true, error };
}

async function sellable(s: string, n: number) {
  const p = await getPublishedProduct(s);
  if (!p) return "This product is no longer available.";
  if (!p.sizes.includes(n)) return `EU ${n} is not offered for ${p.name}.`;
  if (p.soldOutSizes.includes(n)) return `${p.name} in EU ${n} is sold out.`;
}


export async function cartAdd(input: { slug: string; size: number; quantity: number }): Promise<CartResult> {
  const v = z.object({ slug, size, quantity: qty }).safeParse(input);
  if (!v.success) return currentCart("Something is wrong with this item. Please refresh the page.");
  return mutate(async (doc, save) => {
    const problem = await sellable(v.data.slug, v.data.size);
    if (problem) return problem;
    const line = doc.bag.find((l) => l.slug === v.data.slug && l.size === v.data.size);
    const p = (await getPublishedProduct(v.data.slug))!;
    const left = stockLeft(p, v.data.size);
    const cap = Math.min(MAX_QTY, left ?? MAX_QTY);
    const want = (line?.quantity ?? 0) + v.data.quantity;
    if (!line && doc.bag.length >= MAX_LINES) return `Your bag can hold up to ${MAX_LINES} different items.`;
    if (line) line.quantity = Math.min(cap, want);
    else doc.bag.push({ slug: v.data.slug, size: v.data.size, quantity: Math.min(cap, want), addedAt: new Date() });
    if (left !== null && want > left) {
      // Saved at the cap; the message explains why the quantity is lower.
      await save();
      return `Only ${left} ${left === 1 ? "pair" : "pairs"} of ${p.name} in EU ${v.data.size} left. Your bag already has them all.`;
    }
  });
}

export async function cartSetQuantity(lineId: string, quantity: number): Promise<CartResult> {
  const q = qty.safeParse(quantity);
  return mutate(async (doc, save) => {
    if (!q.success) return "Choose a quantity from 1 to 10.";
    const line = doc.bag.find((l) => lineIdOf(l.slug, l.size) === lineId);
    if (!line) return "That item is no longer in your bag.";
    const p = await getPublishedProduct(line.slug);
    const left = p ? stockLeft(p, line.size) : null;
    if (left !== null && q.data > left) {
      line.quantity = Math.max(1, left);
      await save();
      return `Only ${left} ${left === 1 ? "pair" : "pairs"} left in EU ${line.size}.`;
    }
    line.quantity = q.data;
  });
}

export async function cartRemove(lineId: string): Promise<CartResult> {
  return mutate((doc) => {
    doc.bag = doc.bag.filter((l) => lineIdOf(l.slug, l.size) !== lineId);
  });
}

export async function cartClear(): Promise<CartResult> {
  return mutate((doc) => {
    doc.bag = [];
  });
}

export async function wishlistSet(productSlug: string, saved: boolean): Promise<CartResult> {
  const s = slug.safeParse(productSlug);
  return mutate(async (doc) => {
    if (!s.success) return "Something is wrong with this item. Please refresh the page.";
    const has = doc.wishlist.some((w) => w.slug === s.data);
    if (saved && !has) {
      if (!(await getPublishedProduct(s.data))) return "This product is no longer available.";
      if (doc.wishlist.length >= MAX_WISH) return `Your wishlist can hold up to ${MAX_WISH} items.`;
      doc.wishlist.push({ slug: s.data, addedAt: new Date() });
    }
    if (!saved && has) doc.wishlist = doc.wishlist.filter((w) => w.slug !== s.data);
  });
}

/** One-time import of a bag/wishlist saved in this browser before accounts held them. */
export async function cartImportLocal(input: {
  bag: { slug: string; size: number; quantity: number }[];
  wishlist: string[];
}): Promise<CartResult> {
  const v = z
    .object({
      bag: z.array(z.object({ slug, size, quantity: qty })).max(MAX_LINES),
      wishlist: z.array(slug).max(MAX_WISH),
    })
    .safeParse(input);
  if (!v.success) return currentCart("Something went wrong. Please refresh the page.");
  return mutate(async (doc) => {
    for (const l of v.data.bag) {
      if (await sellable(l.slug, l.size)) continue;
      const line = doc.bag.find((x) => x.slug === l.slug && x.size === l.size);
      if (line) line.quantity = Math.max(line.quantity, l.quantity);
      else if (doc.bag.length < MAX_LINES) doc.bag.push({ ...l, addedAt: new Date() });
    }
    for (const s of v.data.wishlist) {
      if (!doc.wishlist.some((w) => w.slug === s) && doc.wishlist.length < MAX_WISH && (await getPublishedProduct(s))) {
        doc.wishlist.push({ slug: s, addedAt: new Date() });
      }
    }
  });
}
