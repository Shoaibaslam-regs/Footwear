import Link from "next/link";
import type { OfferSummary } from "@/lib/coupons";

/**
 * "You have a coupon" strip for the bag and checkout. One coupon opens its
 * scratch card; several open "My Coupons" on the account page.
 */
export default function OfferStripView({ offers, compact = false }: { offers: OfferSummary[]; compact?: boolean }) {
  if (offers.length === 0) return null;
  const one = offers.length === 1 ? offers[0] : null;
  const href = one ? `/offers/${one.code}` : "/account#my-coupons";
  return (
    <Link
      className={`group relative overflow-hidden flex items-center gap-space-sm border border-dashed border-secondary/60 bg-gradient-to-r from-secondary-container/50 via-surface-container-lowest to-secondary-container/30 hover:border-secondary transition-colors ${compact ? "p-space-sm" : "p-space-md rounded-xl"}`}
      href={href}
    >
      <span className={`shrink-0 rounded-full bg-primary text-secondary-fixed flex items-center justify-center ${compact ? "w-9 h-9" : "w-11 h-11"}`}>
        <span className="material-symbols-outlined icon-filled text-[20px]">redeem</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-label-uppercase text-label-uppercase text-secondary tracking-[0.16em]">
          {one ? (one.surprise ? "You have a surprise card" : "You have a coupon") : `You have ${offers.length} coupons`}
        </span>
        {/* The discount stays hidden until the card is scratched. */}
        <span className={`block text-primary ${compact ? "font-body-md text-body-md font-semibold" : "font-headline-sm text-headline-sm"}`}>
          {one ? (one.headline ?? "Scratch to see your discount") : "Scratch to see your discounts"}
        </span>
        {one && !compact && <span className="block font-body-sm text-body-sm text-on-surface-variant truncate">{one.conditions}</span>}
      </span>
      <span className="shrink-0 flex items-center gap-1 font-label-uppercase text-label-uppercase text-primary group-hover:text-secondary transition-colors">
        <span className="hidden sm:inline">{one ? (one.headline ? "View card" : "Scratch to reveal") : "See my coupons"}</span>
        <span className="material-symbols-outlined text-[18px] transition-transform group-hover:translate-x-0.5">arrow_forward</span>
      </span>
    </Link>
  );
}
