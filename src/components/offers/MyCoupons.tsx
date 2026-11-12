import Link from "next/link";
import { publicCouponsFor } from "@/lib/server/coupons";

/** "My Coupons" on the account page: tickets that open their scratch card. */
export default async function MyCoupons({ userId }: { userId: string }) {
  const offers = await publicCouponsFor(userId);
  return (
    <div className="mt-space-lg sm:mt-space-xl scroll-mt-32" id="my-coupons">
      <span className="font-label-uppercase text-[10px] sm:text-label-uppercase text-secondary uppercase tracking-[0.2em]">Offers for You</span>
      <h2 className="font-headline-sm text-[19px] leading-tight sm:font-headline-md sm:text-headline-md text-primary mt-1 mb-space-sm sm:mb-space-md">Coupons</h2>
      {offers.length === 0 ? (
        <p className="font-body-sm text-body-sm sm:font-body-md sm:text-body-md text-on-surface-variant">
          No coupons right now. New offers will show here, and we also share them on WhatsApp and Instagram.
        </p>
      ) : (
        <ul className="grid grid-cols-2 xl:grid-cols-3 gap-space-sm sm:gap-gutter">
          {offers.map((o) => (
            <li key={o.code} className="drop-shadow-[0_2px_4px_rgba(33,27,25,0.10)] hover:drop-shadow-[0_10px_18px_rgba(33,27,25,0.18)] transition-[filter] duration-300">
              <Link
                className="ticket-zigzag group relative flex h-full bg-surface-container-highest p-1.5 sm:p-2.5"
                href={`/offers/${o.code}`}
              >
                <span className="flex-1 flex flex-col justify-between gap-space-xs sm:gap-space-sm rounded-md bg-surface-container-lowest p-space-sm sm:p-space-md overflow-hidden relative">
                  {/* Gold edge, like the scratch card's foil */}
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 w-2 bg-gradient-to-b from-[#dfbe76] via-[#d4af37] to-[#aa771c]" />
                  <span className="flex items-start justify-between gap-space-sm pr-1 sm:pr-space-sm">
                    <span>
                      <span className="inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full bg-secondary text-on-secondary font-label-uppercase text-[8px] sm:text-[10px] tracking-widest">
                        <span className="material-symbols-outlined icon-filled text-[11px] sm:text-[13px]">workspace_premium</span>
                        {o.surprise ? "SURPRISE" : "COUPON"}
                      </span>
                      {o.headline ? (
                        <span className="block font-headline-sm text-[19px] leading-tight sm:font-headline-md sm:text-headline-md text-primary pt-space-xs">{o.headline}</span>
                      ) : (
                        // Hidden until scratched: a blurred placeholder hints at a discount without showing it.
                        <span className="block pt-space-xs">
                          <span aria-hidden="true" className="block font-headline-sm text-[19px] leading-tight sm:font-headline-md sm:text-headline-md text-primary blur-[6px] select-none">
                            ??% OFF
                          </span>
                          <span className="sr-only">Discount hidden until you scratch the card</span>
                        </span>
                      )}
                    </span>
                    <span className="hidden sm:inline material-symbols-outlined text-secondary text-[24px]">redeem</span>
                  </span>
                  <span className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant pr-space-sm">{o.conditions}</span>
                  <span className="flex flex-wrap items-center justify-between gap-x-space-sm gap-y-1 pt-space-xs border-t border-dashed border-outline-variant/60 pr-space-sm">
                    <span className="font-label-uppercase text-[8px] sm:text-[10px] text-outline tracking-widest whitespace-nowrap">
                      {o.validUntil ? `UNTIL ${o.validUntil.toUpperCase()}` : "NO END DATE"}
                    </span>
                    <span className="flex items-center gap-1 font-label-uppercase text-[9px] sm:text-label-uppercase text-primary group-hover:text-secondary transition-colors whitespace-nowrap sm:ml-auto">
                      {o.headline ? "View card" : <><span className="sm:hidden">Scratch</span><span className="hidden sm:inline">Scratch to reveal</span></>}
                      <span className="material-symbols-outlined text-[14px] sm:text-[16px]">arrow_forward</span>
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
