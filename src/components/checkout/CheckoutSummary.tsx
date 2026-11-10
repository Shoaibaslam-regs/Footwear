"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import type { CartItem } from "@/lib/cart-data";
import { whatsappUrl } from "@/lib/data";
import Price from "@/components/Price";
import { formatPrice } from "@/lib/currency";
import { lineProductId, removeFromBag, toggleWishlist, useCurrency } from "@/lib/store";
import { showToast } from "@/lib/toast";
import type { CouponResult, CouponTerms } from "@/lib/coupons";
import CouponBox from "./CouponBox";
import OfferStripView from "@/components/offers/OfferStripView";
import type { OfferSummary } from "@/lib/coupons";

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
  coupon,
  couponNote,
  couponResult,
  itemDiscount,
  deliveryDiscount,
  onCouponChange,
  offers,
}: {
  offers: OfferSummary[];
  coupon: CouponTerms | null;
  couponNote?: string;
  couponResult: CouponResult | null;
  itemDiscount: number;
  deliveryDiscount: number;
  onCouponChange: (terms: CouponTerms | null) => void;
  items: CartItem[];
  pieces: number;
  subtotal: number;
  shipping: number;
  deliveryName: string;
  total: number;
}) {
  const currency = useCurrency();
  // Phones/tablets: the summary sits at the top as a bar showing the total; it opens to the items.
  const [open, setOpen] = useState(false);
  const fold = open ? "" : "max-lg:hidden";

  return (
    <div className="order-first lg:order-none lg:col-span-5 lg:sticky lg:top-28 space-y-space-md">
      <div className="bg-surface-container-lowest p-space-md sm:p-space-lg shadow-sm">
        {/* Larger screens: a heading. Phones: a toggle with the total. */}
        <div className="hidden lg:flex items-baseline justify-between pb-space-sm border-b border-surface-container-high mb-space-md">
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Order Summary</h2>
          <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest uppercase">
            {pieces} {pieces === 1 ? "Pair" : "Pairs"}
          </span>
        </div>
        <button
          aria-controls="checkout-summary-items"
          aria-expanded={open}
          className="lg:hidden w-full flex items-center justify-between gap-space-sm text-left"
          onClick={() => setOpen((v) => !v)}
          type="button"
        >
          <span className="flex items-center gap-space-sm min-w-0">
            <span className="material-symbols-outlined text-secondary text-[22px]">shopping_bag</span>
            <span className="min-w-0">
              <span className="block font-headline-sm text-[18px] text-primary leading-tight">Order Summary</span>
              <span className="flex items-center gap-1 font-label-uppercase text-[11px] uppercase tracking-wider text-secondary">
                {open ? "Hide" : "Show"} {pieces} {pieces === 1 ? "pair" : "pairs"}
                <span className={`material-symbols-outlined text-[16px] transition-transform ${open ? "rotate-180" : ""}`}>expand_more</span>
              </span>
            </span>
          </span>
          <span className="font-headline-sm text-headline-sm text-primary whitespace-nowrap">{formatPrice(total, "PKR")}</span>
        </button>

        {/* Bag Items */}
        <ul className={`flex flex-col max-lg:mt-space-sm max-lg:pt-space-xs max-lg:border-t max-lg:border-surface-container-high ${fold}`} id="checkout-summary-items">
          {items.map((item, i) => (
            <li
              key={item.id}
              className={`flex gap-space-md py-space-sm${i > 0 ? ` ${divider}` : ""}`}
            >
              <div className="relative w-16 h-20 sm:w-24 sm:h-32 flex-shrink-0 bg-surface-container-high overflow-hidden">
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
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2">
                    <h3 className="font-headline-sm text-[16px] sm:text-headline-sm text-primary leading-tight font-normal min-w-0 line-clamp-2">
                      {item.href ? (
                        <Link className="hover:text-secondary transition-colors" href={item.href}>
                          {item.name}
                        </Link>
                      ) : (
                        item.name
                      )}
                    </h3>
                    <span className="font-body-md text-body-md sm:font-body-lg sm:text-body-lg text-primary font-semibold whitespace-nowrap">
                      <Price amount={item.price * item.quantity} />
                    </span>
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 line-clamp-1">
                    {item.material}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 mt-2 text-on-surface-variant font-label-uppercase text-[11px] uppercase tracking-wider">
                    <span>
                      Size: <strong className="text-primary">{item.size}</strong>
                    </span>
                    <span>
                      Qty: <strong className="text-primary">{item.quantity}</strong>
                    </span>
                    <span className="hidden sm:inline">
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

        {/* Coupon */}
        <div className={`mt-space-md pt-space-md ${divider} space-y-space-xs`}>
          {couponNote && !coupon && (
            <p className="font-body-sm text-body-sm text-error" role="status">
              {couponNote}
            </p>
          )}
          {!coupon && <OfferStripView compact offers={offers} />}
          <CouponBox onChange={onCouponChange} result={couponResult} terms={coupon} />
        </div>

        {/* Financial Breakdown */}
        <div className={`mt-space-md pt-space-md ${divider} space-y-2 ${fold}`}>
          <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>
              Item Subtotal ({pieces} {pieces === 1 ? "Pair" : "Pairs"})
            </span>
            <span className="text-primary font-medium"><Price amount={subtotal} /></span>
          </div>
          {itemDiscount > 0 && coupon && (
            <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
              <span>Coupon {coupon.code}</span>
              <span className="text-secondary font-medium">
                −<Price amount={itemDiscount} />
              </span>
            </div>
          )}
          <div className="flex justify-between font-body-md text-body-md text-on-surface-variant">
            <span>{deliveryName}</span>
            {deliveryDiscount > 0 ? (
              <span className="text-secondary font-medium">
                <span className="line-through text-outline mr-1.5"><Price amount={shipping} /></span>
                Free with coupon
              </span>
            ) : shipping === 0 ? (
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
      <div className="hidden lg:flex bg-surface-container-high p-space-md items-center justify-between">
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
