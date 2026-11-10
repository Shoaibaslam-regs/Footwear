"use server";

import { refresh, updateTag } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { sendMail, siteUrl, statusLines } from "@/lib/server/mail";
import { getOrderForUser, updateOrder } from "@/lib/server/orders";
import { SALES_TAG } from "@/lib/server/sales";
import { PRODUCTS_TAG } from "@/lib/server/products";
import { releaseStock } from "@/lib/server/stock";
import { releaseCoupon } from "@/lib/server/coupons";

export type CancelState = { ok?: string; error?: string } | undefined;

/** Clients may cancel their own order until the team confirms it. */
export async function cancelMyOrder(_: CancelState, formData: FormData): Promise<CancelState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please log in." };
  const order = await getOrderForUser(String(formData.get("number") ?? ""), user.id);
  if (!order) return { error: "Order not found." };
  if (order.status !== "pending") {
    return { error: "This order is already being prepared. Please message us on WhatsApp to change it." };
  }
  const ok = await updateOrder(order.id, { status: "cancelled" }, { kind: "status", text: "Cancelled by customer", by: user.email }, "pending");
  if (!ok) return { error: "This order was just updated. Please refresh the page." };
  await releaseStock(order.items);
  if (order.coupon) await releaseCoupon(order.coupon.code, order.userId);
  updateTag(SALES_TAG);
  updateTag(PRODUCTS_TAG);
  refresh();
  await sendMail(user.email, `Order #${order.number} cancelled — Ŕose Atelier`, "Order cancelled", statusLines({ ...order, status: "cancelled" }), {
    label: "Continue shopping",
    href: `${await siteUrl()}/collections`,
  });
  return { ok: "Your order has been cancelled." };
}
