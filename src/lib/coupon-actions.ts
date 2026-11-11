"use server";

import { ObjectId } from "mongodb";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "./auth/dal";
import { CODE_RX, normaliseCode, type CouponTerms } from "./coupons";
import { carts } from "./server/carts";
import { appliedCouponFor, coupons, couponState, getCouponByCode, markRevealed, toTerms, unavailableReason } from "./server/coupons";
import { RULES, blocked, hit } from "./server/rate-limit";

export type CouponActionResult =
  | { ok: true; terms: CouponTerms }
  /** `cardUrl`: the code is a surprise campaign; the customer gets their own code by scratching this card. */
  | { ok: false; error: string; cardUrl?: string; retryAfter?: number };

/**
 * Saves a coupon on the customer's bag. Coupon-wide rules (active, dates,
 * total uses, this customer's uses) are checked here; the bag-based rules
 * (minimum order, sale items) are shown live at checkout and enforced again
 * in placeOrder.
 */
export async function applyCouponCode(raw: string): Promise<CouponActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Please log in to use a coupon." };
  // Wrong codes are limited, so link-only codes can't be found by guessing.
  const wait = await blocked(RULES.couponUser, user.id);
  if (wait) return { ok: false, error: "", retryAfter: wait };
  const code = normaliseCode(String(raw ?? ""));
  const c = CODE_RX.test(code) ? await getCouponByCode(code) : null;
  // Someone else's surprise card counts as a wrong code too: it is not theirs to find.
  if (!c || (c.ownerId && c.ownerId.toHexString() !== user.id)) {
    await hit(RULES.couponUser, user.id);
    if (!c) return { ok: false, error: "This code is not valid." };
  }
  if (c?.type === "random") {
    // Never applied directly: send them to their own scratch card (it stays hidden until scratched).
    if (couponState(c) === "active" || (await (await coupons()).countDocuments({ campaignId: c._id, ownerId: new ObjectId(user.id) })) > 0) {
      return { ok: false, error: "This is a surprise card code. Scratch your card to get your own code and discount.", cardUrl: `/offers/${c.code}` };
    }
    return { ok: false, error: couponState(c) === "used_up" ? "All the surprise cards have been given out." : "This offer has ended." };
  }
  const reason = await unavailableReason(c, user.id);
  if (reason || !c) return { ok: false, error: reason ?? "This code is not valid." };
  await (await carts()).updateOne(
    { _id: new ObjectId(user.id) },
    { $set: { coupon: c.code, updatedAt: new Date() }, $setOnInsert: { bag: [], wishlist: [] } },
    { upsert: true },
  );
  forgetCheckout();
  return { ok: true, terms: toTerms(c) };
}

export async function removeCouponCode(): Promise<{ ok: true }> {
  const user = await getCurrentUser();
  if (user) await (await carts()).updateOne({ _id: new ObjectId(user.id) }, { $unset: { coupon: "" }, $set: { updatedAt: new Date() } });
  forgetCheckout();
  return { ok: true };
}

/** The customer scratched a card: remember it, so their tickets show the discount from now on. */
export async function markCouponRevealed(raw: string): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const c = await getCouponByCode(normaliseCode(String(raw ?? "")));
  if (!c || c.type === "random" || (c.ownerId && c.ownerId.toHexString() !== user.id)) return;
  await markRevealed(c, user.id);
}

/**
 * The browser keeps pages it has already shown. A checkout opened before the
 * coupon was applied would come back without it, and the discount would only
 * show after the order was placed. Clearing these paths makes the next visit
 * load them fresh.
 */
function forgetCheckout() {
  revalidatePath("/checkout");
  revalidatePath("/cart");
}

/** The coupon saved on this customer's bag right now (checkout re-reads it whenever it opens). */
export async function currentCoupon(): Promise<{ terms: CouponTerms | null; dropped?: string }> {
  const user = await getCurrentUser();
  if (!user) return { terms: null };
  return appliedCouponFor(user.id);
}
