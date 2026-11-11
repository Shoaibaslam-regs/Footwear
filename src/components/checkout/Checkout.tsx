"use client";

import Image from "next/image";
import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { placeOrder, type PlaceOrderState } from "@/app/(shop)/checkout/actions";
import type { DeliveryOption } from "@/lib/site";
import type { SavedAddress } from "@/lib/auth/dal";
import { paymentMethodLabel } from "@/lib/orders";
import { clearBag, useBag } from "@/lib/store";
import Price from "@/components/Price";
import { applyCoupon, type CouponTerms } from "@/lib/coupons";
import { currentCoupon } from "@/lib/coupon-actions";
import type { OfferSummary } from "@/lib/coupons";
import CheckoutSteps, { type StepTarget } from "./CheckoutSteps";
import ContactCard from "./ContactCard";
import ShippingForm from "./ShippingForm";
import DeliveryOptions from "./DeliveryOptions";
import PaymentSection from "./PaymentSection";
import CheckoutSummary from "./CheckoutSummary";

type PlacedOrder = Extract<NonNullable<PlaceOrderState>, { ok: true }>["order"];

const pill =
  "h-[52px] px-8 rounded-full font-label-uppercase text-label-uppercase uppercase tracking-widest transition-all duration-300 flex items-center justify-center";


export default function Checkout({
  user,
  deliveryOptions,
  saved,
  coupon: initialCoupon,
  couponNote,
  offers,
}: {
  user: { name: string; email: string } | null;
  deliveryOptions: DeliveryOption[];
  saved: SavedAddress | null;
  coupon: CouponTerms | null;
  /** Why a previously applied coupon was removed, if it was. */
  couponNote?: string;
  /** Public coupons this customer can still use (for the "You have a coupon" strip). */
  offers: OfferSummary[];
}) {
  const items = useBag();
  const [state, formAction, pending] = useActionState(placeOrder, undefined);
  const [step, setStep] = useState(2);
  const [delivery, setDelivery] = useState(deliveryOptions[0].id);
  const [coupon, setCoupon] = useState<CouponTerms | null>(initialCoupon);
  const [droppedNote, setDroppedNote] = useState(couponNote);
  // The page may come from the browser's memory (e.g. Back, or opened before the
  // coupon was applied on the offer page), so re-read the bag's coupon on open.
  useEffect(() => {
    let live = true;
    currentCoupon()
      .then((r) => {
        if (!live) return;
        setCoupon(r.terms);
        if (r.dropped) setDroppedNote(r.dropped);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const pieces = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);
  const option = deliveryOptions.find((o) => o.id === delivery) ?? deliveryOptions[0];
  const shipping = option.fee;
  // Live coupon maths for display; the server recomputes it when the order is placed.
  const couponResult = coupon
    ? applyCoupon(coupon, items.map((i) => ({ unitPrice: i.price, quantity: i.quantity, discountPercent: i.discountPercent })), shipping)
    : null;
  const itemDiscount = couponResult?.ok ? couponResult.itemDiscount : 0;
  const deliveryDiscount = couponResult?.ok ? couponResult.deliveryDiscount : 0;
  const total = subtotal - itemDiscount + shipping - deliveryDiscount;
  const placed = state?.ok ? state.order : null;
  const errors = state && !state.ok ? state.errors : undefined;

  // Once the server has saved the order, empty the bag.
  useEffect(() => {
    if (!placed) return;
    clearBag();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [placed]);

  const goToStep = (n: number, target?: StepTarget) => {
    setStep(n);
    if (target) {
      document
        .getElementById(`step-section-${target}`)
        ?.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (placed) return <OrderConfirmation order={placed} signedIn={!!user} />;

  if (items.length === 0) {
    return (
      <div className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
        <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col items-center text-center gap-space-md">
          <span className="material-symbols-outlined text-secondary text-[40px]">
            shopping_bag
          </span>
          <h1 className="font-headline-md text-headline-md text-primary">
            Your bag is empty
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
            Add something to your bag before you check out.
          </p>
          <Link className={`${pill} bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed shadow-xl`} href="/collections">
            Shop Now
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-md lg:py-space-xl">
      <CheckoutSteps current={step} onSelect={goToStep} />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-start">
        <form action={formAction} className="lg:col-span-7 flex flex-col gap-space-lg" noValidate>
          <ContactCard errors={errors} user={user} />
          <ShippingForm defaults={saved} errors={errors} />
          <DeliveryOptions onSelect={setDelivery} options={deliveryOptions} selected={delivery} />
          <PaymentSection
            phone={saved?.phone}
            errors={errors}
            message={state && !state.ok ? state.message : undefined}
            pending={pending}
            total={total}
          />
        </form>
        <CheckoutSummary
          coupon={coupon}
          couponNote={droppedNote}
          couponResult={couponResult}
          offers={offers}
          deliveryDiscount={deliveryDiscount}
          itemDiscount={itemDiscount}
          onCouponChange={setCoupon}
          items={items}
          pieces={pieces}
          subtotal={subtotal}
          shipping={shipping}
          deliveryName={option.name}
          total={total}
        />
      </div>
    </div>
  );
}

function OrderConfirmation({ order, signedIn }: { order: PlacedOrder; signedIn: boolean }) {
  const pieces = order.items.reduce((n, i) => n + i.quantity, 0);
  return (
    <section className="w-full max-w-3xl mx-auto px-margin-mobile lg:px-margin py-space-xl flex flex-col gap-space-lg">
      <div className="text-center flex flex-col items-center gap-space-sm">
        <span className="material-symbols-outlined icon-filled text-secondary text-[44px]">
          check_circle
        </span>
        <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.25em]">
          Order Received · #{order.number}
        </span>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight">
          Thank You, {order.customer.name.split(" ")[0]}
        </h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-xl">
          Our team will confirm your order soon and send updates to {order.customer.email}.
          Payment: {paymentMethodLabel(order.payment.method)}. Delivery: {order.delivery.name}.
        </p>
      </div>

      <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
        <div className="flex items-baseline justify-between pb-space-sm border-b border-surface-container-high">
          <h2 className="font-headline-sm text-headline-sm text-primary">Order Details</h2>
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-widest">
            {pieces} {pieces === 1 ? "Pair" : "Pairs"}
          </span>
        </div>
        <ul>
          {order.items.map((item) => (
            <li key={`${item.slug}-${item.size}`} className="flex items-center gap-space-md py-space-sm border-b border-surface-container-high last:border-b-0">
              <div className="relative w-16 h-20 flex-shrink-0 bg-surface-container-high overflow-hidden rounded">
                <Image alt={item.alt} className="object-cover" fill sizes="64px" src={item.image} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-body-md text-body-md text-primary font-medium truncate">{item.name}</p>
                <p className="font-body-sm text-body-sm text-on-surface-variant">
                  EU {item.size} · Qty {item.quantity}
                  {item.discountPercent > 0 && ` · −${item.discountPercent}%`}
                </p>
              </div>
              <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                <Price amount={item.unitPrice * item.quantity} />
              </span>
            </li>
          ))}
        </ul>
        <div className="pt-space-sm space-y-1 font-body-sm text-body-sm text-on-surface-variant">
          {order.discountTotal > 0 && (
            <div className="flex justify-between">
              <span>Discount</span>
              <span className="text-error">
                −<Price amount={order.discountTotal} />
              </span>
            </div>
          )}
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{order.shippingFee === 0 ? "Free" : <Price amount={order.shippingFee} />}</span>
          </div>
          {order.coupon && (
            <div className="flex justify-between">
              <span>Coupon {order.coupon.code}</span>
              {order.coupon.type === "free_delivery" ? (
                <span className="text-secondary">
                  Free delivery (saved <Price amount={order.coupon.discount} />)
                </span>
              ) : (
                <span className="text-secondary">
                  −<Price amount={order.coupon.discount} />
                </span>
              )}
            </div>
          )}
        </div>
        <div className="pt-space-md mt-space-sm border-t-2 border-primary flex items-baseline justify-between">
          <span className="font-headline-sm text-headline-sm text-primary">Total</span>
          <span className="font-headline-md text-headline-md text-primary">
            <Price amount={order.total} />
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-space-md justify-center">
        <Link className={`${pill} bg-primary-container text-secondary-fixed hover:bg-secondary-fixed hover:text-on-secondary-fixed shadow-xl`} href="/collections">
          Continue Shopping
        </Link>
        {signedIn && (
          <Link className={`${pill} bg-surface-container hover:bg-surface-container-high text-primary`} href="/account">
            Track Order
          </Link>
        )}
      </div>
    </section>
  );
}
