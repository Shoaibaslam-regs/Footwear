"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { getSiteSettings } from "@/lib/server/settings";
import { checkoutMethodValues, isWalletMethod, type Order, type PaymentMethod, type OrderItem } from "@/lib/orders";
import { salePrice } from "@/lib/products";
import { insertOrder } from "@/lib/server/orders";
import { getPublishedProducts } from "@/lib/server/products";
import { SALES_TAG } from "@/lib/server/sales";
import { carts } from "@/lib/server/carts";
import { releaseStock, reserveStock } from "@/lib/server/stock";
import { PRODUCTS_TAG } from "@/lib/server/products";
import { getDb } from "@/lib/server/db";
import { orderPlacedLines, sendMail, siteUrl } from "@/lib/server/mail";
import { updateTag } from "next/cache";
import { applyCoupon } from "@/lib/coupons";
import { claimCoupon, coupons, getCouponByCode, releaseCoupon, toTerms, unavailableReason } from "@/lib/server/coupons";
import { MAX_PENDING_ORDERS, RULES, blocked, hit } from "@/lib/server/rate-limit";
import { mailConfigured } from "@/lib/server/mail";
import { checkOrderCode, needsOrderCode, orderFingerprint, resendOrderCode, startOrderCode, type CheckoutData } from "@/lib/server/order-codes";

export type PlaceOrderState =
  | {
      ok?: false;
      errors?: Record<string, string[] | undefined>;
      message?: string;
      /** The hourly order limit was reached: seconds until Place Order works again. */
      retryAfter?: number;
      /** Cash on Delivery from a new customer: a code was emailed; show the code dialog. */
      confirm?: { email: string; total: number };
      /** The code dialog should close (expired, or the order changed): place the order again. */
      restart?: boolean;
    }
  | {
      ok: true;
      order: Pick<Order, "number" | "items" | "total" | "listTotal" | "discountTotal" | "shippingFee" | "delivery" | "payment" | "customer" | "coupon">;
    }
  | undefined;

const text = (max: number, msg: string) => z.string().trim().min(1, msg).max(max);

const schema = z.object({
  name: text(80, "Enter your full name."),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address.")),
  phone: z
    .string()
    .trim()
    .regex(/^[+()\d\s-]{7,20}$/, "Enter a valid phone number."),
  line1: text(160, "Enter your street address."),
  line2: z.string().trim().max(160),
  city: text(80, "Enter your city."),
  postalCode: text(20, "Enter your postal code."),
  country: z.enum(countries.map((c) => c.code) as [string, ...string[]], "Choose a country."),
  delivery: z.string().min(1, "Choose a delivery option.").max(60),
  paymentMethod: z.enum(checkoutMethodValues as [PaymentMethod, ...PaymentMethod[]], "Choose a payment method."),
  walletNumber: z.string().trim(),
});


type User = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
type Failure = Exclude<PlaceOrderState, { ok: true } | undefined>;

/** Account limits against fake orders: a few per hour, and only a few waiting to be confirmed. */
async function orderLimits(user: User): Promise<Failure | null> {
  const orderWait = await blocked(RULES.orderUser, user.id);
  if (orderWait) return { retryAfter: orderWait };
  const pendingOrders = await (await getDb())
    .collection("orders")
    .countDocuments({ userId: new ObjectId(user.id), status: "pending" });
  if (pendingOrders >= MAX_PENDING_ORDERS) {
    return {
      message: `You already have ${pendingOrders} orders waiting for us to confirm. Please wait until we confirm them, or message us on WhatsApp.`,
    };
  }
  return null;
}

/** Reads and checks the checkout form. */
function readForm(fd: FormData): { ok: true; data: CheckoutData } | { ok: false; state: Failure } {
  const parsed = schema.safeParse({
    name: fd.get("name") ?? "",
    email: fd.get("email") ?? "",
    phone: fd.get("phone") ?? "",
    line1: fd.get("line1") ?? "",
    line2: fd.get("line2") ?? "",
    city: fd.get("city") ?? "",
    postalCode: fd.get("postalCode") ?? "",
    country: fd.get("country") ?? "",
    delivery: fd.get("delivery") ?? "",
    paymentMethod: fd.get("paymentMethod") ?? "",
    walletNumber: fd.get("walletNumber") ?? "",
  });
  if (!parsed.success) {
    return { ok: false, state: { errors: z.flattenError(parsed.error).fieldErrors, message: "Please check the highlighted fields." } };
  }
  const data = { ...parsed.data };
  // EasyPaisa / JazzCash need a Pakistani mobile account: 03XXXXXXXXX (or +92 3XXXXXXXXX).
  if (isWalletMethod(data.paymentMethod)) {
    const digits = data.walletNumber.replace(/[\s-]/g, "").replace(/^\+?92/, "0");
    if (!/^03\d{9}$/.test(digits)) {
      return {
        ok: false,
        state: { errors: { walletNumber: ["Enter your wallet's mobile number, e.g. 03XX XXXXXXX."] }, message: "Please check the highlighted fields." },
      };
    }
    data.walletNumber = digits;
  } else {
    data.walletNumber = "";
  }
  return { ok: true, data };
}

/**
 * Builds the order from the account bag in MongoDB, re-priced from the current
 * listings (nothing the browser sends about items or prices is trusted), and
 * checks the coupon against the real bag and fee. Reserves nothing.
 */
async function priceOrder(user: User, data: CheckoutData) {
  const cartCol = await carts();
  const cart = await cartCol.findOne({ _id: new ObjectId(user.id) });
  const catalogue = new Map((await getPublishedProducts()).map((p) => [p.slug, p]));
  // Same rule as the bag display: unpublished/removed pieces are not shown, so they are not ordered.
  const available = (cart?.bag ?? []).filter((it) => catalogue.get(it.slug)?.sizes.includes(it.size));
  if (!cart || available.length === 0) return { ok: false as const, state: { message: "Your bag is empty." } as Failure };
  const lines: OrderItem[] = [];
  for (const it of available) {
    const p = catalogue.get(it.slug)!;
    if (p.soldOutSizes.includes(it.size)) {
      return { ok: false as const, state: { message: `${p.name} in EU ${it.size} is sold out. Please choose another size.` } as Failure };
    }
    lines.push({
      slug: p.slug,
      name: p.name,
      size: it.size,
      quantity: it.quantity,
      unitPrice: salePrice(p),
      listPrice: p.price,
      discountPercent: p.discountPercent,
      image: p.image,
      alt: p.alt,
    });
  }

  const option = (await getSiteSettings()).deliveryOptions.find((d) => d.id === data.delivery);
  if (!option) return { ok: false as const, state: { errors: { delivery: ["Choose a delivery option."] }, message: "Please choose a delivery option." } as Failure };
  const listTotal = lines.reduce((n, l) => n + l.listPrice * l.quantity, 0);
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

  // Coupon: every rule is checked again here, against the real bag and fee.
  let coupon: NonNullable<Order["coupon"]> | undefined;
  let itemDiscount = 0;
  let deliveryDiscount = 0;
  const couponDoc = cart.coupon ? await getCouponByCode(cart.coupon) : null;
  if (cart.coupon) {
    const why = await unavailableReason(couponDoc, user.id);
    if (why || !couponDoc) return { ok: false as const, state: { message: `Coupon ${cart.coupon}: ${why ?? "This code is not valid."} Remove it to continue.` } as Failure };
    const r = applyCoupon(toTerms(couponDoc), lines, option.fee);
    if (!r.ok) return { ok: false as const, state: { message: `Coupon ${couponDoc.code}: ${r.reason} Or remove the coupon to continue.` } as Failure };
    itemDiscount = r.itemDiscount;
    deliveryDiscount = r.deliveryDiscount;
    coupon = { code: couponDoc.code, type: couponDoc.type, discount: itemDiscount + deliveryDiscount };
    if (couponDoc.campaignId) {
      const campaign = await (await coupons()).findOne({ _id: couponDoc.campaignId }, { projection: { code: 1 } });
      if (campaign) coupon.campaign = campaign.code;
    }
  }
  const total = subtotal - itemDiscount + option.fee - deliveryDiscount;
  // Everything that makes this order what it is: a code confirms exactly this.
  const fingerprint = orderFingerprint({
    lines: lines.map((l) => [l.slug, l.size, l.quantity, l.unitPrice]),
    coupon: coupon ? [coupon.code, coupon.discount] : null,
    delivery: [option.id, option.fee],
    total,
    data,
  });
  return { ok: true as const, cart, cartCol, lines, option, listTotal, subtotal, couponDoc, coupon, itemDiscount, deliveryDiscount, total, fingerprint };
}

/** Reserves stock, claims the coupon, saves the order and empties the bag. */
async function finalise(user: User, data: CheckoutData, priced: Extract<Awaited<ReturnType<typeof priceOrder>>, { ok: true }>, codeConfirmed: boolean): Promise<PlaceOrderState> {
  const { cart, cartCol, lines, option, listTotal, subtotal, couponDoc, coupon, deliveryDiscount, total } = priced;
  const reserved = await reserveStock(lines);
  if (!reserved.ok) return { message: reserved.error };
  if (couponDoc && coupon) {
    const taken = await claimCoupon(couponDoc, user.id);
    if (taken) {
      await releaseStock(lines);
      return { message: `Coupon ${couponDoc.code}: ${taken} Remove it to continue.` };
    }
  }

  let order: Awaited<ReturnType<typeof insertOrder>>;
  try {
    order = await insertOrder({
      userId: new ObjectId(user.id),
      customer: { name: data.name, email: data.email, phone: data.phone },
      address: {
        line1: data.line1,
        line2: data.line2,
        city: data.city,
        postalCode: data.postalCode,
        country: data.country,
      },
      items: lines,
      listTotal,
      discountTotal: listTotal - subtotal,
      shippingFee: option.fee - deliveryDiscount,
      total,
      ...(coupon ? { coupon } : {}),
      delivery: { id: option.id, name: option.name },
      payment: {
        method: data.paymentMethod as Order["payment"]["method"],
        status: "pending",
        reference: "",
        ...(data.walletNumber ? { walletNumber: data.walletNumber } : {}),
      },
      status: "pending",
      trackingNumber: "",
      ...(codeConfirmed ? { codeConfirmed: true } : {}),
    });
  } catch (e) {
    await releaseStock(lines);
    if (coupon) await releaseCoupon(coupon.code, user.id);
    throw e;
  }
  // Only orders that were really placed count towards the hourly limit.
  await hit(RULES.orderUser, user.id);

  // Remember delivery details for next time, and confirm by email (if set up).
  await (await getDb())
    .collection("users")
    .updateOne(
      { _id: new ObjectId(user.id) },
      { $set: { savedAddress: { phone: data.phone, line1: data.line1, line2: data.line2, city: data.city, postalCode: data.postalCode } } },
    );
  await sendMail(
    data.email,
    `Order received #${order.number} — Ŕose Atelier`,
    "Thank you for your order",
    orderPlacedLines(order),
    { label: "View your order", href: `${await siteUrl()}/account/orders/${order.number}` },
  );

  // Empty the bag only after the order is safely stored.
  await cartCol.updateOne({ _id: cart._id }, { $set: { bag: [], updatedAt: new Date() }, $unset: { coupon: "" } });
  updateTag(SALES_TAG);
  updateTag(PRODUCTS_TAG); // stock changed

  return {
    ok: true,
    order: {
      number: order.number,
      items: order.items,
      total: order.total,
      listTotal: order.listTotal,
      discountTotal: order.discountTotal,
      shippingFee: order.shippingFee,
      delivery: order.delivery,
      payment: order.payment,
      customer: order.customer,
      coupon: order.coupon,
    },
  };
}

export async function placeOrder(_: PlaceOrderState, fd: FormData): Promise<PlaceOrderState> {
  // Orders are only taken from signed-in clients (checked against the DB, not just the cookie).
  const user = await getCurrentUser();
  if (!user) return { message: "Please log in to place your order." };
  const limited = await orderLimits(user);
  if (limited) return limited;
  const form = readForm(fd);
  if (!form.ok) return form.state;
  const priced = await priceOrder(user, form.data);
  if (!priced.ok) return priced.state;

  // Cash on Delivery from a customer with no delivered order yet: confirm by email code first.
  if (form.data.paymentMethod === "cod" && mailConfigured() && (await needsOrderCode(user.id))) {
    const started = await startOrderCode(user.id, form.data, priced.fingerprint, priced.total);
    if (!started.ok) return "retryAfter" in started ? { retryAfter: started.retryAfter } : { message: started.error };
    return { confirm: { email: form.data.email, total: priced.total } };
  }
  return finalise(user, form.data, priced, false);
}

const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

/**
 * The code from the email. The order is priced again now and must be exactly
 * the one the code was sent for; then it is placed as normal.
 */
export async function confirmCodOrder(_: PlaceOrderState, fd: FormData): Promise<PlaceOrderState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Please log in to place your order.", restart: true };
  const code = codeSchema.safeParse(String(fd.get("code") ?? "").replace(/\s+/g, ""));
  if (!code.success) return { errors: { code: z.flattenError(code.error).formErrors } };
  const limited = await orderLimits(user);
  if (limited) return { ...limited, restart: true };
  const r = await checkOrderCode(user.id, code.data);
  if (!r.ok) return { message: r.error, ...(r.expired ? { restart: true } : {}) };
  const priced = await priceOrder(user, r.data);
  if (!priced.ok) return { ...priced.state, restart: true };
  if (priced.fingerprint !== r.fingerprint) {
    return { restart: true, message: "Your bag, prices or details changed after the code was sent. Please check the order and press Place Order again." };
  }
  return finalise(user, r.data, priced, true);
}

/** "Resend code" in the checkout dialog. */
export async function resendCodOrderCode(): Promise<{ ok?: true; error?: string; retryAfter?: number }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in first." };
  const r = await resendOrderCode(user.id);
  if (r.ok) return { ok: true };
  return "retryAfter" in r ? { retryAfter: r.retryAfter } : { error: r.error };
}
