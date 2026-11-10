"use server";

import { ObjectId } from "mongodb";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { getSiteSettings } from "@/lib/server/settings";
import { isWalletMethod, paymentMethods, type Order, type OrderItem } from "@/lib/orders";
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
import { claimCoupon, getCouponByCode, releaseCoupon, toTerms, unavailableReason } from "@/lib/server/coupons";

export type PlaceOrderState =
  | {
      ok?: false;
      errors?: Record<string, string[] | undefined>;
      message?: string;
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
  paymentMethod: z.enum(paymentMethods.map((m) => m.value), "Choose a payment method."),
  walletNumber: z.string().trim(),
});


export async function placeOrder(_: PlaceOrderState, fd: FormData): Promise<PlaceOrderState> {
  // Orders are only taken from signed-in clients (checked against the DB, not just the cookie).
  const user = await getCurrentUser();
  if (!user) return { message: "Please log in to place your order." };

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
    const errors = z.flattenError(parsed.error).fieldErrors;
    return { errors, message: "Please check the highlighted fields." };
  }
  const data = parsed.data;

  // EasyPaisa / JazzCash need a Pakistani mobile account: 03XXXXXXXXX (or +92 3XXXXXXXXX).
  let walletNumber = "";
  if (isWalletMethod(data.paymentMethod)) {
    const digits = data.walletNumber.replace(/[\s-]/g, "").replace(/^\+?92/, "0");
    if (!/^03\d{9}$/.test(digits)) {
      return {
        errors: { walletNumber: ["Enter your wallet's mobile number, e.g. 03XX XXXXXXX."] },
        message: "Please check the highlighted fields.",
      };
    }
    walletNumber = digits;
  }

  // The order is built from the account bag in MongoDB, re-priced from the
  // current listings: nothing the browser sends about items or prices is trusted.
  const cartCol = await carts();
  const cart = await cartCol.findOne({ _id: new ObjectId(user.id) });
  const catalogue = new Map((await getPublishedProducts()).map((p) => [p.slug, p]));
  // Same rule as the bag display: unpublished/removed pieces are not shown, so they are not ordered.
  const available = (cart?.bag ?? []).filter((it) => catalogue.get(it.slug)?.sizes.includes(it.size));
  if (!cart || available.length === 0) return { message: "Your bag is empty." };
  const lines: OrderItem[] = [];
  for (const it of available) {
    const p = catalogue.get(it.slug)!;
    if (p.soldOutSizes.includes(it.size)) {
      return { message: `${p.name} in EU ${it.size} is sold out. Please choose another size.` };
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
  if (!option) return { errors: { delivery: ["Choose a delivery option."] }, message: "Please choose a delivery option." };
  const listTotal = lines.reduce((n, l) => n + l.listPrice * l.quantity, 0);
  const subtotal = lines.reduce((n, l) => n + l.unitPrice * l.quantity, 0);

  // Coupon: every rule is checked again here, against the real bag and fee.
  let coupon: NonNullable<Order["coupon"]> | undefined;
  let itemDiscount = 0;
  let deliveryDiscount = 0;
  const couponDoc = cart.coupon ? await getCouponByCode(cart.coupon) : null;
  if (cart.coupon) {
    const why = await unavailableReason(couponDoc, user.id);
    if (why || !couponDoc) return { message: `Coupon ${cart.coupon}: ${why ?? "This code is not valid."} Remove it to continue.` };
    const r = applyCoupon(toTerms(couponDoc), lines, option.fee);
    if (!r.ok) return { message: `Coupon ${couponDoc.code}: ${r.reason} Or remove the coupon to continue.` };
    itemDiscount = r.itemDiscount;
    deliveryDiscount = r.deliveryDiscount;
    coupon = { code: couponDoc.code, type: couponDoc.type, discount: itemDiscount + deliveryDiscount };
  }

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
    total: subtotal - itemDiscount + option.fee - deliveryDiscount,
    ...(coupon ? { coupon } : {}),
    delivery: { id: option.id, name: option.name },
    payment: {
      method: data.paymentMethod,
      status: "pending",
      reference: "",
      ...(walletNumber ? { walletNumber } : {}),
    },
    status: "pending",
    trackingNumber: "",
  });
  } catch (e) {
    await releaseStock(lines);
    if (coupon) await releaseCoupon(coupon.code, user.id);
    throw e;
  }

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
