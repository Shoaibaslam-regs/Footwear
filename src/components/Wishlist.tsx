"use client";

import { requireLogin } from "@/lib/require-login";
import Image from "next/image";
import Link from "next/link";
import Price from "@/components/Price";
import { addToBag, removeFromWishlist, useWishlist } from "@/lib/store";
import { confirmRemoveFromWishlist } from "@/components/cart/confirmRemove";

const DEFAULT_SIZE = "EU 38";

export default function Wishlist() {
  const items = useWishlist();

  return (
    <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md mb-space-lg">
        <div>
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
            Wishlist
          </span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight mt-1">
            Saved Items
          </h1>
        </div>
        <span className="font-label-uppercase text-label-uppercase text-on-surface-variant uppercase tracking-widest">
          {items.length} {items.length === 1 ? "Item" : "Items"}
        </span>
      </div>

      {items.length === 0 ? (
        <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col items-center text-center gap-space-md">
          <span className="material-symbols-outlined text-secondary text-[40px]">
            favorite
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary">
            Your wishlist is empty
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Tap the heart on any product to save it here for later.
          </p>
          <Link
            className="px-8 py-4 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-xl"
            href="/collections"
          >
            Shop Now
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-gutter">
          {items.map((w) => (
            <article
              key={w.id}
              className="group bg-surface-container-lowest rounded-lg p-1.5 sm:p-space-sm shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between min-w-0"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded bg-surface-container-low mb-space-sm sm:mb-space-md">
                <Image
                  alt={w.alt}
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  src={w.image}
                />
                <button
                  aria-label={`Remove ${w.name} from Wishlist`}
                  className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface/90 hover:bg-surface text-error flex items-center justify-center transition-colors shadow-sm"
                  onClick={() => confirmRemoveFromWishlist(w)}
                  type="button"
                >
                  <span className="material-symbols-outlined icon-filled text-[19px]">
                    favorite
                  </span>
                </button>
              </div>
              <div className="flex flex-col px-space-xs pb-space-xs gap-1">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2">
                  <h2 className="font-headline-sm text-[15px] leading-snug sm:text-headline-sm text-primary group-hover:text-secondary transition-colors line-clamp-2">
                    {w.href ? <Link href={w.href}>{w.name}</Link> : w.name}
                  </h2>
                  <span className="font-label-md text-label-md font-semibold text-primary whitespace-nowrap sm:pt-1">
                    <Price amount={w.price} />
                  </span>
                </div>
                {w.detail && (
                  <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant line-clamp-1">
                    {w.detail}
                  </p>
                )}
                <button
                  className="w-full mt-space-xs sm:mt-space-sm h-10 sm:h-11 bg-primary-container hover:bg-secondary-fixed text-surface hover:text-on-secondary-fixed font-label-uppercase text-[11px] sm:text-label-uppercase uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1 shadow-md whitespace-nowrap"
                  onClick={async () => {
                    if (!(await requireLogin("add items to your bag"))) return;
                    addToBag({ ...w, size: DEFAULT_SIZE, material: w.detail });
                    removeFromWishlist(w.id);
                  }}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">
                    shopping_bag
                  </span>
                  <span className="sm:hidden">Add to Bag</span>
                  <span className="hidden sm:inline">Move to Bag</span>
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
