import Link from "next/link";
import { publicCouponsFor } from "@/lib/server/coupons";

/** "My Coupons" on the account page: tickets that open their scratch card. */
export default async function MyCoupons({ userId }: { userId: string }) {
  const offers = await publicCouponsFor(userId);
  return (
    <div className="mt-space-xl scroll-mt-32" id="my-coupons">
      <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">Offers for You</span>
      <h2 className="font-headline-md text-headline-md text-primary mt-1 mb-space-md">My Coupons</h2>
      {offers.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant">
          No coupons right now. New offers will show here, and we also share them on WhatsApp and Instagram.
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gutter">
          {offers.map((o) => (
            <li key={o.code}>
              <Link
                className="group relative flex h-full rounded-xl bg-surface-container-highest p-2 shadow-sm hover:shadow-xl transition-shadow"
                href={`/offers/${o.code}`}
              >
                <span className="flex-1 flex flex-col justify-between gap-space-sm rounded-lg bg-surface-container-lowest p-space-md overflow-hidden relative">
                  {/* Gold edge, like the scratch card's foil */}
                  <span aria-hidden="true" className="absolute inset-y-0 right-0 w-2 bg-gradient-to-b from-[#dfbe76] via-[#d4af37] to-[#aa771c]" />
                  <span className="flex items-start justify-between gap-space-sm pr-space-sm">
                    <span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-on-secondary font-label-uppercase text-[10px] tracking-widest">
                        <span className="material-symbols-outlined icon-filled text-[13px]">workspace_premium</span>
                        {o.surprise ? "SURPRISE CARD" : "COUPON"}
                      </span>
                      {o.headline ? (
                        <span className="block font-headline-md text-headline-md text-primary pt-space-xs">{o.headline}</span>
                      ) : (
                        // Hidden until scratched: a blurred placeholder hints at a discount without showing it.
                        <span className="block pt-space-xs">
                          <span aria-hidden="true" className="block font-headline-md text-headline-md text-primary blur-[6px] select-none">
                            ??% OFF
                          </span>
                          <span className="sr-only">Discount hidden until you scratch the card</span>
                        </span>
                      )}
                    </span>
                    <span className="material-symbols-outlined text-secondary text-[24px]">redeem</span>
                  </span>
                  <span className="block font-body-sm text-body-sm text-on-surface-variant pr-space-sm">{o.conditions}</span>
                  <span className="flex items-center justify-between gap-space-sm pt-space-xs border-t border-dashed border-outline-variant/60 pr-space-sm">
                    <span className="font-label-uppercase text-[10px] text-outline tracking-widest">
                      {o.validUntil ? `VALID UNTIL ${o.validUntil.toUpperCase()}` : "NO END DATE"}
                    </span>
                    <span className="flex items-center gap-1 font-label-uppercase text-label-uppercase text-primary group-hover:text-secondary transition-colors">
                      {o.headline ? "View card" : "Scratch to reveal"}
                      <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
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
