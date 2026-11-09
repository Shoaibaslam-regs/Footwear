"use client";

import Image from "next/image";
import Link from "next/link";
import type { CartItem } from "@/lib/cart-data";
import { whatsappUrl } from "@/lib/data";
import Price from "@/components/Price";
import { formatPrice } from "@/lib/currency";
import { lineProductId, removeFromBag, toggleWishlist, useCurrency } from "@/lib/store";
import { showToast } from "@/lib/toast";

const divider = "border-t border-surface-container-high";

function saveForLater(item: CartItem) {
  toggleWishlist({
    id: lineProductId(item.id),
    name: item.name,
    price: item.price,
    image: item.image,
    alt: item.alt,
    href: item.href,
    detail: item.material,
  });
  removeFromBag(item.id);
  showToast("Added to Wishlist");
}

export default function CheckoutSummary({
  items,
  pieces,
  subtotal,
  shipping,
  deliveryName,
  total,
}: {
  items: CartItem[];
  pieces: number;
  subtotal: number;
  shipping: number;
  deliveryName: string;
  total: number;
}) {
  const currency = useCurrency();

  return (
    <div className="lg:col-span-5 lg:sticky lg:top-28 space-y-space-md">
      <div className="bg-surface-container-lowest p-space-lg shadow-sm">
        <div className="flex items-baseline justify-between pb-space-sm border-b border-surface-container-high mb-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">
            Order Summary
          </h2>
          <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest uppercase">
            {pieces} {pieces === 1 ? "Pair" : "Pairs"}
          </span>
        </div>

        {/* Bag Items */}
        <ul className="flex flex-col">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={`flex gap-space-md py-space-sm${i > 0 ? ` ${divider}` : ""}`}
            >
              <div className="relative w-24 h-32 flex-shrink-0 bg-surface-container-high overflow-hidden">
                <Image
                  className="w-full h-full object-cover"
                  alt={item.alt}
                  src={item.image}
                  fill
                  sizes="96px"
                />
                {item.quantity > 1 && (
                  <span className="absolute top-1 left-1 bg-primary text-on-primary font-label-uppercase text-[9px] px-1.5 py-0.5 tracking-wider uppercase">
                    ×{item.quantity}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-headline-sm text-body-lg sm:text-headline-sm text-primary leading-tight font-normal min-w-0 break-words">
                      {item.href ? (
                        <Link className="hover:text-secondary transition-colors" href={item.href}>
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </h3>
                    <span className="font-body-lg text-body-lg text-primary font-semibold whitespace-nowrap">
                      <Price amount={item.price * item.quantity} />
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
                    {item.material}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-2 text-on-surface-variant font-label-uppercase text-[11px] uppercase tracking-wider">
                    <span>
                      Size: <strong className="text-primary">{item.size}</strong>
                    </span>
                    <span>
                      Qty: <strong className="text-primary">{item.quantity}</strong>
                    </span>
                    <span>
                      Color: <strong className="text-secondary">{item.drawerColor}</strong>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-space-md text-on-surface-variant font-label-uppercase text-[11px] uppercase">
                  <button
                    className="hover:text-primary transition-colors underline underline-offset-2"
                    onClick={() => saveForLater(item)}
                    type="button"
                  >
                    Save for Later
                  </button>
                  <Link className="hover:text-primary transition-colors underline underline-offset-2" href="/cart">
                    Edit Bag
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>

        {/* Financial Breakdown */}
        <div className={`mt-space-md pt-space-md ${divider} space-y-2`}>
          <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>
              Item Subtotal ({pieces} {pieces === 1 ? "Pair" : "Pairs"})
            </span>
            <span className="text-primary font-medium"><Price amount={subtotal} /></span>
          </div>
          <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>{deliveryName}</span>
            {shipping === 0 ? (
              <span className="text-secondary font-medium uppercase tracking-wider">
                Free
              </span>
            ) : (
              <span className="text-primary font-medium"><Price amount={shipping} /></span>
            )}
          </div>
          <div className="pt-space-md mt-space-md border-t-2 border-primary flex items-baseline justify-between">
            <div>
              <span className="font-headline-sm text-headline-sm text-primary">
                Total
              </span>
            </div>
            <div className="text-right">
              <span className="font-headline-md text-headline-md text-primary font-normal tracking-tight whitespace-nowrap">
                {formatPrice(total, "PKR")}
              </span>
              {currency !== "PKR" && (
                <span className="block font-label-uppercase text-[11px] text-outline">
                  <Price amount={total} /> · charged in PKR
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Concierge Card */}
      <div className="bg-surface-container-high p-space-md flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="material-symbols-outlined text-secondary text-[28px]">
            support_agent
          </span>
          <div>
            <p className="font-headline-sm text-[16px] text-primary leading-snug">
              Questions about size or delivery?
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Chat with us on WhatsApp before you order.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="h-9 px-3 bg-surface-container-lowest text-primary hover:bg-primary hover:text-on-primary font-label-uppercase text-label-uppercase uppercase tracking-wider flex items-center gap-1 transition-colors"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined text-[16px]">chat</span>{" "}
            WhatsApp
          </a>
        </div>
      </div>

    </div>
  );
}
