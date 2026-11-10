"use client";

import { useSyncExternalStore } from "react";
import type { CartItem } from "./cart-data";
import {
  cartAdd,
  cartClear,
  cartImportLocal,
  cartRemove,
  cartSetQuantity,
  wishlistSet,
  type CartResult,
} from "./cart-actions";
import type { Currency } from "./currency";
import { showToast } from "./toast";
import type { BagProduct, WishItem } from "./store-types";

export type { BagProduct, WishItem };

/**
 * Client mirror of the signed-in account's bag and wishlist (stored in
 * MongoDB). Changes show instantly, then the server's saved version wins.
 * Only the display currency is kept per device.
 */
type State = {
  bag: CartItem[];
  wishlist: WishItem[];
  currency: Currency;
  signedIn: boolean;
};

const CURRENCY_KEY = "elora:currency";
/** Dispatched after adding to the bag; the shop layout's mini bag listens for it. */
export const BAG_OPEN_EVENT = "elora:bag-open";
/** Pre-account storage; imported into the account once, then removed. */
const LEGACY_KEY = "elora:store:v2";
const MAX_QTY = 10;

const INITIAL: State = { bag: [], wishlist: [], currency: "PKR", signedIn: false };

let state: State = INITIAL;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function set(next: Partial<State>) {
  state = { ...state, ...next };
  emit();
}

function apply(r: CartResult) {
  set({ bag: r.cart.bag, wishlist: r.cart.wishlist, signedIn: r.signedIn });
}

/* ---------- Server sync ---------- */

let queue: Promise<unknown> = Promise.resolve();
let pending = 0;

/** Runs server writes one at a time; only the last result is applied. */
function sync(op: () => Promise<CartResult>) {
  pending++;
  queue = queue
    .then(op)
    .then((r) => {
      if (r.error) showToast(r.error);
      if (--pending === 0 || r.error) apply(r);
    })
    .catch(() => {
      pending--;
      showToast("Could not save your bag. Please check your connection.");
      void refreshCart();
    });
}

let loading: Promise<void> | null = null;

/** Reloads bag + wishlist for whoever is signed in now (after sign-in/out). */
export function refreshCart(): Promise<void> {
  loading ??= (async () => {
    try {
      const res = await fetch("/api/cart", { cache: "no-store", credentials: "same-origin" });
      if (!res.ok) return;
      const data = (await res.json()) as CartResult["cart"] & { signedIn: boolean };
      if (pending === 0) set({ bag: data.bag, wishlist: data.wishlist, signedIn: data.signedIn });
      if (data.signedIn) importLegacy();
    } catch {
      // Offline: keep what we have.
    } finally {
      loading = null;
    }
  })();
  return loading;
}

function importLegacy() {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(LEGACY_KEY);
  } catch {
    return;
  }
  if (!raw) return;
  try {
    const old = JSON.parse(raw) as { bag?: CartItem[]; wishlist?: WishItem[]; currency?: Currency };
    if (old.currency && old.currency !== state.currency) setCurrency(old.currency);
    const bag = (old.bag ?? []).flatMap((i) => {
      const size = Number(i.size.replace(/[^\d.]/g, ""));
      return Number.isInteger(size) ? [{ slug: lineProductId(i.id), size, quantity: Math.min(MAX_QTY, i.quantity) }] : [];
    });
    const wishlist = (old.wishlist ?? []).map((w) => w.id);
    if (bag.length || wishlist.length) sync(() => cartImportLocal({ bag, wishlist }));
  } catch {
    // Corrupt legacy data: nothing to import.
  }
  try {
    window.localStorage.removeItem(LEGACY_KEY);
  } catch {}
}

function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  try {
    const c = window.localStorage.getItem(CURRENCY_KEY);
    if (c === "PKR" || c === "USD" || c === "EUR") state = { ...state, currency: c };
  } catch {}
  void refreshCart();
  // Another tab signed in/out or changed the bag: pick it up when we come back.
  window.addEventListener("focus", () => void refreshCart());
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function useStore<T>(select: (s: State) => T): T {
  return useSyncExternalStore(subscribe, () => select(state), () => select(INITIAL));
}

/* ---------- Selectors ---------- */

export const useBag = () => useStore((s) => s.bag);
export const useBagCount = () => useStore((s) => s.bag.reduce((n, i) => n + i.quantity, 0));
export const useWishlist = () => useStore((s) => s.wishlist);
export const useIsWishlisted = (id: string) => useStore((s) => s.wishlist.some((w) => w.id === id));
export const useCurrency = () => useStore((s) => s.currency);

/* ---------- Actions ---------- */

const sizeNumber = (size: string) => Number(size.replace(/[^\d.]/g, ""));

/** Bag line id: one line per product + size, e.g. "aurelia-stiletto--eu-38". */
const lineId = (p: BagProduct) => `${p.id}--eu-${sizeNumber(p.size)}`;

/** Product slug a bag line belongs to. */
export const lineProductId = (lineIdValue: string) => lineIdValue.split("--")[0];

/** Placeholder line shown until the server returns the real one. */
function optimisticLine(p: BagProduct, quantity: number): CartItem {
  return {
    id: lineId(p),
    href: p.href,
    badge: "Limited Edition",
    collection: p.collection ?? "",
    name: p.name,
    drawerName: p.name,
    price: p.price,
    discountPercent: 0, // replaced by the server's line a moment later
    material: p.material ?? "",
    size: `EU ${sizeNumber(p.size)}`,
    color: p.color ?? "",
    drawerColor: p.color ?? "",
    colorDot: "bg-secondary",
    profile: "",
    stockNote: "Saving to your bag…",
    stockNoteClass: "text-on-surface-variant",
    stockDotClass: "bg-primary",
    packaging: { title: "Ŕose Atelier Gift Box:", text: "Comes with a silk shoe bag with our logo." },
    quantity,
    image: p.image,
    alt: p.alt,
    thumb: p.image,
    thumbAlt: p.alt,
  };
}

export function addToBag(p: BagProduct, quantity = 1, opts: { openBag?: boolean } = {}) {
  const id = lineId(p);
  const existing = state.bag.find((i) => i.id === id);
  set({
    bag: existing
      ? state.bag.map((i) => (i.id === id ? { ...i, quantity: Math.min(MAX_QTY, i.quantity + quantity) } : i))
      : [...state.bag, optimisticLine(p, quantity)],
  });
  sync(() => cartAdd({ slug: p.id, size: sizeNumber(p.size), quantity }));
  if (opts.openBag !== false) window.dispatchEvent(new Event(BAG_OPEN_EVENT));
}

export function setBagQuantity(id: string, quantity: number) {
  const q = Math.max(1, Math.min(MAX_QTY, quantity));
  set({ bag: state.bag.map((i) => (i.id === id ? { ...i, quantity: q } : i)) });
  sync(() => cartSetQuantity(id, q));
}

export function removeFromBag(id: string) {
  set({ bag: state.bag.filter((i) => i.id !== id) });
  sync(() => cartRemove(id));
}

export function clearBag() {
  set({ bag: [] });
  sync(() => cartClear());
}

/** Toggles a wishlist entry. Returns true when it was added. */
export function toggleWishlist(item: WishItem): boolean {
  const has = state.wishlist.some((w) => w.id === item.id);
  set({ wishlist: has ? state.wishlist.filter((w) => w.id !== item.id) : [...state.wishlist, item] });
  sync(() => wishlistSet(item.id, !has));
  return !has;
}

export function removeFromWishlist(id: string) {
  set({ wishlist: state.wishlist.filter((w) => w.id !== id) });
  sync(() => wishlistSet(id, false));
}

export function setCurrency(currency: Currency) {
  set({ currency });
  try {
    window.localStorage.setItem(CURRENCY_KEY, currency);
  } catch {}
}
