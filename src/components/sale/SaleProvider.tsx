"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { livePrice, nextSaleChange, type LivePrice, type SaleEvent } from "@/lib/sale-events";

/**
 * Sale events for the storefront (lib/sale-events.ts). The shop layout passes
 * the schedule; pages are pre-built without the clock, so prices switch here,
 * in the browser, exactly when a sale starts or ends. The clock only "ticks" at
 * those moments (and when the tab comes back), not every second.
 * On the server and during hydration `now` is null and no sale applies, so the
 * HTML matches; the sale price appears as soon as the page is interactive.
 */

type Clock = { subscribe: (cb: () => void) => () => void; get: () => number | null };

function makeClock(events: SaleEvent[]): Clock {
  let now: number | null = null;
  let timer = 0;
  const listeners = new Set<() => void>();
  const plan = () => {
    clearTimeout(timer);
    const next = nextSaleChange(events, now ?? Date.now());
    // setTimeout can't wait longer than ~24.8 days; it simply re-plans then.
    if (next !== null) timer = window.setTimeout(tick, Math.min(next - Date.now() + 50, 2_000_000_000));
  };
  function tick() {
    now = Date.now();
    listeners.forEach((l) => l());
    plan();
  }
  const onVisible = () => !document.hidden && tick();
  return {
    subscribe(cb) {
      listeners.add(cb);
      if (listeners.size === 1) {
        now = Date.now();
        plan();
        document.addEventListener("visibilitychange", onVisible);
      }
      return () => {
        listeners.delete(cb);
        if (listeners.size === 0) {
          clearTimeout(timer);
          document.removeEventListener("visibilitychange", onVisible);
        }
      };
    },
    get: () => now,
  };
}

const Ctx = createContext<{ events: SaleEvent[]; clock: Clock } | null>(null);

export function SaleProvider({ events, children }: { events: SaleEvent[]; children: React.ReactNode }) {
  const value = useMemo(() => ({ events, clock: makeClock(events) }), [events]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const noop = () => () => {};
const none = () => null;

/** The sale schedule and the current time (null until the page is interactive). */
export function useSaleClock(): { events: SaleEvent[]; now: number | null } {
  const ctx = useContext(Ctx);
  const now = useSyncExternalStore(ctx?.clock.subscribe ?? noop, ctx?.clock.get ?? none, none);
  return { events: ctx?.events ?? [], now };
}

/** Price fields as cards carry them: `price` is what is paid, `compareAt` the normal price. */
export type CardPrice = { slug?: string; category?: string; price: number; compareAt?: number; discountPercent?: number };

/** The live price for a card's price fields (unchanged before the clock starts or without a slug). */
export function liveCardPrice(c: CardPrice, events: SaleEvent[], now: number | null): LivePrice {
  if (!c.slug || now === null) {
    return { price: c.price, compareAt: c.compareAt, discountPercent: c.discountPercent ?? 0, couponPercent: c.discountPercent ?? 0 };
  }
  return livePrice({ slug: c.slug, category: c.category, price: c.compareAt ?? c.price, ownPercent: c.discountPercent ?? 0 }, events, now);
}

export function useCardPrice(c: CardPrice): LivePrice {
  const { events, now } = useSaleClock();
  return liveCardPrice(c, events, now);
}
