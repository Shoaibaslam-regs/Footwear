"use client";

import Link from "next/link";
import Price from "@/components/Price";
import { useBottomBar } from "@/lib/use-bottom-bar";

/**
 * Phones only: subtotal and Checkout always in reach at the bottom of the bag.
 * While it is shown it sets `--bottom-bar` on <html>, so the WhatsApp button
 * and toasts sit above it instead of on top of it.
 */
export default function MobileCheckoutBar({ pieces, subtotal }: { pieces: number; subtotal: number }) {
  useBottomBar(76);

  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/40 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      <div className="h-[76px] px-margin-mobile flex items-center justify-between gap-space-md">
        <div className="min-w-0">
          <span className="block font-label-uppercase text-[10px] uppercase tracking-widest text-on-surface-variant">
            Subtotal · {pieces} {pieces === 1 ? "pair" : "pairs"}
          </span>
          <span className="block font-headline-sm text-headline-sm text-primary whitespace-nowrap">
            <Price amount={subtotal} />
          </span>
        </div>
        <Link
          className="h-12 px-space-lg shrink-0 bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed rounded-full font-label-uppercase text-label-uppercase uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors shadow-md"
          href="/checkout"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">lock</span>
          Checkout
        </Link>
      </div>
    </div>
  );
}
