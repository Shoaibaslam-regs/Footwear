import type { Metadata } from "next";
import { Suspense } from "react";
import Checkout from "@/components/checkout/Checkout";
import { getSavedAddress, requireUser } from "@/lib/auth/dal";
import { getSiteSettings } from "@/lib/server/settings";
import { appliedCouponFor, publicCouponsFor } from "@/lib/server/coupons";

export const metadata: Metadata = {
  title: "Checkout — Ŕose Atelier",
  description: "Place your Ŕose Atelier order securely.",
};

/** Checkout is for signed-in clients only (proxy.ts redirects others first). */
async function CheckoutForUser() {
  const [user, { deliveryOptions }] = await Promise.all([requireUser("/checkout"), getSiteSettings()]);
  const [saved, applied, offers] = await Promise.all([getSavedAddress(user.id), appliedCouponFor(user.id), publicCouponsFor(user.id)]);
  return (
    <Checkout
      coupon={applied.terms}
      couponNote={applied.dropped}
      offers={offers}
      deliveryOptions={deliveryOptions}
      saved={saved}
      user={{ name: user.name, email: user.email }}
    />
  );
}

export default function CheckoutPage() {
  return (
    <div className="flex flex-col w-full">
      <Suspense
        fallback={
          <div className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
            <div className="h-96 bg-surface-container motion-safe:animate-pulse" />
          </div>
        }
      >
        <CheckoutForUser />
      </Suspense>
    </div>
  );
}
