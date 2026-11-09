"use server";

import { MongoServerError, ObjectId } from "mongodb";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin, type UserDoc } from "@/lib/auth/dal";
import { productId } from "@/lib/product-id";
import { ALL_SIZES, MAX_DISCOUNT, MAX_GALLERY, productCategories, productStatuses } from "@/lib/products";
import { getDb } from "@/lib/server/db";
import { PRODUCTS_TAG, type ProductDoc } from "@/lib/server/products";
import { SALES_TAG } from "@/lib/server/sales";
import {
  MAX_ANNOUNCEMENTS,
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_HERO_SLIDES,
  MAX_DELIVERY_OPTIONS,
  POLICY_PAGES,
  type PolicySlug,
  getSiteSettings,
  saveSiteSettings,
  SETTINGS_TAG,
} from "@/lib/server/settings";
import { REVIEWS_TAG, reviewsTag } from "@/lib/server/reviews";
import { nextStatuses, orderStatusLabel, orderStatuses, paymentStatusLabel, paymentStatuses } from "@/lib/orders";
import { getOrderById, updateOrder } from "@/lib/server/orders";
import { deleteImages } from "@/lib/server/images";
import { createResetToken } from "@/lib/server/password-reset";
import { releaseStock } from "@/lib/server/stock";
import { notifyRestocked } from "@/lib/server/stock-alerts";
import { deleteReviewPhotos } from "@/lib/server/review-uploads";
import { sendMail, siteUrl, statusLines } from "@/lib/server/mail";

export type ProductFormState =
  | { errors?: Record<string, string[] | undefined>; message?: string }
  | undefined;

const sizeList = z
  .array(z.coerce.number().refine((n) => (ALL_SIZES as readonly number[]).includes(n)))
  .default([]);

const productSchema = z.object({
  name: z.string().trim().min(2, "Name is required.").max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(120)
    .regex(/^[a-z0-9-]*$/, "Use lowercase letters, numbers and hyphens only."),
  category: z.enum(productCategories.map((c) => c.value) as [string, ...string[]]),
  status: z.enum(productStatuses),
  price: z.coerce.number().int("Whole PKR only.").min(0).max(100_000_000),
  otherSales: z.coerce
    .number()
    .int("Use a whole number of pairs.")
    .min(0, "Cannot be negative.")
    .max(1_000_000),
  discountPercent: z.coerce
    .number()
    .int("Use a whole percentage, e.g. 47.")
    .min(0, "Discount cannot be negative.")
    .max(MAX_DISCOUNT, `Discount cannot exceed ${MAX_DISCOUNT}%.`),
  spec: z.string().trim().max(120),
  material: z.string().trim().min(1, "Material is required.").max(160),
  description: z.string().trim().max(2000),
  gallery: z
    .array(
      z.object({
        url: z.url({ protocol: /^https$/, message: "Every photo needs an https:// URL." }),
        key: z.string().trim().max(200).regex(/^[\w.-]*$/, "Invalid image key."),
        alt: z.string().trim().min(3, "Describe every photo for screen readers (at least 3 characters).").max(300),
        caption: z.string().trim().max(24, "Captions are 24 characters max."),
      }),
      "Add at least one photo.",
    )
    .min(1, "Add at least one photo.")
    .max(MAX_GALLERY, `Up to ${MAX_GALLERY} photos per listing.`),
  badge: z.string().trim().max(40),
  sizes: sizeList.refine((s) => s.length > 0, "Select at least one size."),
  stock: z.record(
    z.string(),
    z.number({ error: "Stock must be whole pairs." }).int("Stock must be whole pairs.").min(0, "Stock cannot be negative.").max(100_000),
  ),
  newArrival: z.boolean(),
  bestSeller: z.boolean(),
});

function readProductForm(fd: FormData) {
  return {
    name: fd.get("name") ?? "",
    slug: fd.get("slug") ?? "",
    category: fd.get("category") ?? "",
    status: fd.get("status") ?? "",
    price: fd.get("price") ?? "",
    discountPercent: fd.get("discountPercent") || "0",
    otherSales: fd.get("otherSales") || "0",
    spec: fd.get("spec") ?? "",
    material: fd.get("material") ?? "",
    description: fd.get("description") ?? "",
    gallery: (() => {
      try {
        return JSON.parse(String(fd.get("gallery") ?? "[]"));
      } catch {
        return [];
      }
    })(),
    badge: fd.get("badge") ?? "",
    sizes: fd.getAll("sizes"),
    stock: Object.fromEntries(
      ALL_SIZES.flatMap((s) => {
        const raw = String(fd.get(`stock:${s}`) ?? "").trim();
        return raw === "" ? [] : [[String(s), Number(raw)]];
      }),
    ),
    newArrival: fd.get("newArrival") === "on",
    bestSeller: fd.get("bestSeller") === "on",
  };
}

export async function saveProduct(
  _: ProductFormState,
  formData: FormData,
): Promise<ProductFormState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const parsed = productSchema.safeParse(readProductForm(formData));
  if (!parsed.success) {
    const errors: Record<string, string[] | undefined> = z.flattenError(parsed.error).fieldErrors;
    // Surface nested gallery issues (e.g. a missing description) under "gallery".
    const galleryIssues = parsed.error.issues.filter((i) => i.path[0] === "gallery").map((i) => i.message);
    if (galleryIssues.length) errors.gallery = [...new Set(galleryIssues)];
    return { errors, message: "Please fix the highlighted fields." };
  }
  const data = parsed.data;
  const doc = {
    ...data,
    category: data.category as ProductDoc["category"],
    slug: data.slug || productId(data.name),
    // Only offered sizes keep a stock count; sold out = tracked at 0.
    stock: Object.fromEntries(Object.entries(data.stock).filter(([s]) => data.sizes.includes(Number(s)))),
    soldOutSizes: data.sizes.filter((s) => data.stock[String(s)] === 0),
    // A pasted URL never carries an upload key.
    gallery: data.gallery.map((g) => ({ ...g, key: g.key && g.url.includes(g.key) ? g.key : "" })),
  };
  const cover = doc.gallery[0];
  const record = { ...doc, image: cover.url, imageKey: cover.key, alt: cover.alt };

  const col = (await getDb()).collection<ProductDoc>("products");
  try {
    if (id) {
      if (!ObjectId.isValid(id)) return { message: "Unknown listing." };
      const previous = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: { ...record, updatedAt: new Date() } },
      );
      if (!previous) return { message: "This listing no longer exists." };
      // Sizes that were sold out and now have stock (or stopped being tracked).
      const wasOut = new Set([...(previous.soldOutSizes ?? []), ...Object.entries(previous.stock ?? {}).filter(([, n]) => n === 0).map(([s]) => Number(s))]);
      const restocked = [...wasOut].filter((s) => record.sizes.includes(s) && !record.soldOutSizes.includes(s));
      await notifyRestocked(record.slug, record.name, restocked);
      const kept = new Set(record.gallery.map((g) => g.key).filter(Boolean));
      for (const g of galleryOf(previous)) {
        if (g.key && !kept.has(g.key)) await releaseImage(g.key, g.url);
      }
    } else {
      const now = new Date();
      await col.insertOne({ ...record, _id: new ObjectId(), createdAt: now, updatedAt: now });
    }
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) {
      return { errors: { slug: ["Another listing already uses this web address."] } };
    }
    throw e;
  }

  updateTag(PRODUCTS_TAG);
  redirect(`/admin/products?saved=${encodeURIComponent(doc.slug)}`);
}

/** Every photo of a stored listing, including pre-gallery documents. */
function galleryOf(d: Pick<ProductDoc, "gallery" | "image" | "imageKey">) {
  return d.gallery?.length ? d.gallery : [{ url: d.image, key: d.imageKey ?? "" }];
}

/** Deletes an uploaded file unless a listing or an order still shows it. */
async function releaseImage(key: string, url: string) {
  const db = await getDb();
  const [inProducts, inOrders, inHero] = await Promise.all([
    db.collection("products").countDocuments({ $or: [{ imageKey: key }, { "gallery.key": key }] }),
    db.collection("orders").countDocuments({ "items.image": url }),
    db.collection("settings").countDocuments({ "heroSlides.key": key }),
  ]);
  if (inProducts === 0 && inOrders === 0 && inHero === 0) await deleteImages([key]);
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  const removed = await (await getDb())
    .collection<ProductDoc>("products")
    .findOneAndDelete({ _id: new ObjectId(id) });
  if (removed) for (const g of galleryOf(removed)) if (g.key) await releaseImage(g.key, g.url);
  updateTag(PRODUCTS_TAG);
  redirect("/admin/products?deleted=1");
}

export async function setProductStatus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const status = z.enum(productStatuses).safeParse(formData.get("status"));
  if (!ObjectId.isValid(id) || !status.success) return;
  await (await getDb())
    .collection("products")
    .updateOne({ _id: new ObjectId(id) }, { $set: { status: status.data, updatedAt: new Date() } });
  updateTag(PRODUCTS_TAG);
}

export async function setUserRole(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = z.enum(["customer", "admin"]).safeParse(formData.get("role"));
  if (!ObjectId.isValid(id) || !role.success) return;
  if (id === me.id && role.data !== "admin") {
    redirect("/admin/users?error=self");
  }
  await (await getDb())
    .collection<UserDoc>("users")
    .updateOne({ _id: new ObjectId(id) }, { $set: { role: role.data } });
  // Return to the page the change was made from (the list or that user's page).
  const back = String(formData.get("back") ?? "");
  redirect(/^\/admin\/users(\/[a-f0-9]{24})?$/.test(back) ? back : "/admin/users");
}

export async function deleteUser(formData: FormData) {
  const me = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  if (id === me.id) redirect("/admin/users?error=self");
  await (await getDb()).collection("users").deleteOne({ _id: new ObjectId(id) });
  redirect("/admin/users");
}

/* ---------- Orders ---------- */


export type OrderActionState = { error?: string; ok?: string } | undefined;

export async function setOrderStatus(_: OrderActionState, fd: FormData): Promise<OrderActionState> {
  const me = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = z.enum(orderStatuses).safeParse(fd.get("status"));
  const tracking = String(fd.get("trackingNumber") ?? "").trim().slice(0, 80);
  if (!to.success) return { error: "Unknown status." };
  const order = await getOrderById(id);
  if (!order) return { error: "Order not found." };
  if (!nextStatuses[order.status].includes(to.data)) {
    return { error: `Cannot move from ${orderStatusLabel[order.status]} to ${orderStatusLabel[to.data]}.` };
  }
  if (to.data === "shipped" && !tracking && !order.trackingNumber) {
    return { error: "Add a courier tracking number before marking as shipped." };
  }
  const set: Parameters<typeof updateOrder>[1] = { status: to.data };
  if (tracking) set.trackingNumber = tracking;
  const note = String(fd.get("note") ?? "").trim().slice(0, 500);
  const ok = await updateOrder(
    id,
    set,
    {
      kind: "status",
      text: `${orderStatusLabel[to.data]}${tracking ? ` · tracking ${tracking}` : ""}${note ? ` — ${note}` : ""}`,
      by: me.email,
    },
    order.status, // guard against two admins acting at once
  );
  if (!ok) return { error: "The order changed in the meantime. Refresh and try again." };
  await sendMail(
    order.customer.email,
    `Order #${order.number}: ${orderStatusLabel[to.data]} — ÉLORA`,
    orderStatusLabel[to.data],
    statusLines({ number: order.number, status: to.data, trackingNumber: tracking || order.trackingNumber }),
    { label: "View your order", href: `${await siteUrl()}/account/orders/${order.number}` },
  );
  // Cancelling stops an order counting towards "sold" and returns its stock.
  if (to.data === "cancelled") {
    await releaseStock(order.items);
    updateTag(SALES_TAG);
    updateTag(PRODUCTS_TAG);
  }
  if (to.data === "delivered" && order.userId) {
    // Reviews this client already wrote for these pieces become verified.
    const slugs = [...new Set(order.items.map((i) => i.slug))];
    await (await getDb())
      .collection("reviews")
      .updateMany({ userId: new ObjectId(order.userId), productSlug: { $in: slugs } }, { $set: { verified: true } });
    for (const s of slugs) updateTag(reviewsTag(s));
    updateTag(REVIEWS_TAG);
  }
  refresh();
  return { ok: `Order marked ${orderStatusLabel[to.data]}.` };
}

export async function setPaymentStatus(_: OrderActionState, fd: FormData): Promise<OrderActionState> {
  const me = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const to = z.enum(paymentStatuses).safeParse(fd.get("paymentStatus"));
  const reference = String(fd.get("reference") ?? "").trim().slice(0, 120);
  if (!to.success) return { error: "Unknown payment status." };
  const order = await getOrderById(id);
  if (!order) return { error: "Order not found." };
  if (to.data === order.payment.status && !reference) return { error: "Payment status is unchanged." };
  const set: Parameters<typeof updateOrder>[1] = { "payment.status": to.data };
  if (reference) set["payment.reference"] = reference;
  await updateOrder(id, set, {
    kind: "payment",
    text: `Payment ${paymentStatusLabel[to.data].toLowerCase()}${reference ? ` · ref ${reference}` : ""}`,
    by: me.email,
  });
  refresh();
  return { ok: `Payment marked ${paymentStatusLabel[to.data]}.` };
}

export async function addOrderNote(_: OrderActionState, fd: FormData): Promise<OrderActionState> {
  const me = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const note = String(fd.get("note") ?? "").trim().slice(0, 1000);
  if (!note) return { error: "Write a note first." };
  const ok = await updateOrder(id, {}, { kind: "note", text: note, by: me.email });
  if (!ok) return { error: "Order not found." };
  refresh();
  return { ok: "Note added." };
}

/* ---------- Deletion ---------- */

const MAX_BULK = 200;

function readIds(fd: FormData): ObjectId[] {
  return [...new Set(fd.getAll("ids").map(String))]
    .filter((id) => ObjectId.isValid(id))
    .slice(0, MAX_BULK)
    .map((id) => new ObjectId(id));
}

/** UploadThing file key from a `https://<app>.ufs.sh/f/<key>` URL. */
function ufsKey(url: string): string | null {
  const m = url.match(/^https:\/\/[a-z0-9]+\.ufs\.sh\/f\/([\w.-]+)$/i);
  return m ? m[1] : null;
}

export async function deleteProducts(formData: FormData) {
  await requireAdmin();
  const ids = readIds(formData);
  if (ids.length === 0) redirect("/admin/products");
  const col = (await getDb()).collection<ProductDoc>("products");
  const docs = await col.find({ _id: { $in: ids } }, { projection: { imageKey: 1, image: 1, gallery: 1 } }).toArray();
  const { deletedCount } = await col.deleteMany({ _id: { $in: ids } });
  for (const d of docs) for (const g of galleryOf(d)) if (g.key) await releaseImage(g.key, g.url);
  updateTag(PRODUCTS_TAG);
  redirect(`/admin/products?deleted=${deletedCount}`);
}

export async function deleteOrders(formData: FormData) {
  await requireAdmin();
  const ids = readIds(formData);
  if (ids.length === 0) redirect("/admin/orders");
  const db = await getDb();
  const col = db.collection("orders");
  const docs = await col.find({ _id: { $in: ids } }, { projection: { "items.image": 1 } }).toArray();
  const { deletedCount } = await col.deleteMany({ _id: { $in: ids } });

  // Images kept only for these orders' history can now go too.
  const urls = [...new Set(docs.flatMap((d) => (d.items as { image: string }[]).map((i) => i.image)))];
  const orphanKeys: string[] = [];
  for (const url of urls) {
    const key = ufsKey(url);
    if (!key) continue;
    const [inProducts, inOrders] = await Promise.all([
      db.collection("products").countDocuments({ $or: [{ imageKey: key }, { image: url }, { "gallery.key": key }] }),
      col.countDocuments({ "items.image": url }),
    ]);
    if (inProducts === 0 && inOrders === 0) orphanKeys.push(key);
  }
  await deleteImages(orphanKeys);
  updateTag(SALES_TAG);
  redirect(`/admin/orders?deleted=${deletedCount}`);
}

/** Removes one entry from an order's history; `at` guards against index drift. */
export async function deleteOrderEvent(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const index = Number(formData.get("index"));
  const at = String(formData.get("at") ?? "");
  if (!ObjectId.isValid(id) || !Number.isInteger(index) || index < 0) return;
  const col = (await getDb()).collection<{ history: { at: Date }[] }>("orders");
  const order = await col.findOne({ _id: new ObjectId(id) }, { projection: { history: 1 } });
  const event = order?.history[index];
  if (!event || event.at.toISOString() !== at) return refresh();
  await col.updateOne(
    { _id: new ObjectId(id) },
    { $set: { history: order.history.filter((_, i) => i !== index) } },
  );
  refresh();
}

export async function clearOrderHistory(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await getDb()).collection("orders").updateOne({ _id: new ObjectId(id) }, { $set: { history: [] } });
  refresh();
}

/* ---------- Reviews (moderation only: admins cannot write reviews) ---------- */

export async function setReviewsStatus(formData: FormData) {
  await requireAdmin();
  const ids = readIds(formData);
  const status = z.enum(["published", "hidden"]).safeParse(formData.get("status"));
  if (ids.length === 0 || !status.success) return;
  const col = (await getDb()).collection("reviews");
  const slugs = await col.distinct("productSlug", { _id: { $in: ids } });
  await col.updateMany({ _id: { $in: ids } }, { $set: { status: status.data } });
  for (const s of slugs) updateTag(reviewsTag(s));
  updateTag(REVIEWS_TAG);
}

export async function deleteReviews(formData: FormData) {
  await requireAdmin();
  const ids = readIds(formData);
  if (ids.length === 0) return;
  const col = (await getDb()).collection<{ productSlug: string; photos?: { key: string }[] }>("reviews");
  const slugs = await col.distinct("productSlug", { _id: { $in: ids } });
  const photoKeys = (await col.find({ _id: { $in: ids } }, { projection: { photos: 1 } }).toArray()).flatMap((r) => (r.photos ?? []).map((p) => p.key));
  await col.deleteMany({ _id: { $in: ids } });
  await deleteReviewPhotos(photoKeys);
  for (const s of slugs) updateTag(reviewsTag(s));
  updateTag(REVIEWS_TAG);
}

/* ---------- Site settings ---------- */

export type SettingsFormState = { ok?: string; error?: string } | undefined;

export async function saveSettings(_: SettingsFormState, formData: FormData): Promise<SettingsFormState> {
  await requireAdmin();
  const lines = String(formData.get("announcements") ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean);
  if (lines.length === 0) return { error: "Add at least one message (one per line)." };
  if (lines.length > MAX_ANNOUNCEMENTS) return { error: `Use up to ${MAX_ANNOUNCEMENTS} messages.` };
  const long = lines.find((l) => l.length > MAX_ANNOUNCEMENT_LENGTH);
  if (long) return { error: `Keep each message under ${MAX_ANNOUNCEMENT_LENGTH} characters: “${long.slice(0, 40)}…”` };

  const slides = z
    .array(
      z.object({
        url: z.url({ protocol: /^https$/, message: "Every slide needs an https:// image." }),
        key: z.string().trim().max(200).regex(/^[\w.-]*$/),
        alt: z.string().trim().min(3, "Describe every hero slide (at least 3 characters).").max(300),
        caption: z.string().max(24).default(""),
      }),
    )
    .min(1, "Keep at least one hero slide.")
    .max(MAX_HERO_SLIDES, `Up to ${MAX_HERO_SLIDES} hero slides.`)
    .safeParse((() => {
      try {
        return JSON.parse(String(formData.get("heroSlides") ?? "[]"));
      } catch {
        return [];
      }
    })());
  if (!slides.success) return { error: [...new Set(slides.error.issues.map((i) => i.message))].join(" ") };
  const heroSlides = slides.data.map((g) => ({ ...g, caption: "", key: g.key && g.url.includes(g.key) ? g.key : "" }));

  const delivery = z
    .array(
      z.object({
        id: z.string().regex(/^[a-z0-9-]{1,40}$/),
        name: z.string().trim().min(2, "Name every delivery option.").max(60),
        eta: z.string().trim().max(60),
        description: z.string().trim().max(200),
        fee: z.coerce.number().int("Delivery fees are whole PKR.").min(0, "Fees cannot be negative.").max(100_000),
      }),
    )
    .min(1, "Keep at least one delivery option.")
    .max(MAX_DELIVERY_OPTIONS, `Up to ${MAX_DELIVERY_OPTIONS} delivery options.`)
    .refine((list) => new Set(list.map((d) => d.id)).size === list.length, "Delivery options must be unique.")
    .safeParse((() => {
      try {
        return JSON.parse(String(formData.get("deliveryOptions") ?? "[]"));
      } catch {
        return [];
      }
    })());
  if (!delivery.success) return { error: [...new Set(delivery.error.issues.map((i) => i.message))].join(" ") };

  const policies = Object.fromEntries(
    POLICY_PAGES.map((p) => [p.slug, String(formData.get(`policy:${p.slug}`) ?? "").trim().slice(0, 20_000)]),
  ) as Record<PolicySlug, string>;

  const previous = await getSiteSettings();
  await saveSiteSettings({ announcements: lines, heroSlides, deliveryOptions: delivery.data, policies });
  updateTag(SETTINGS_TAG);

  // Delete uploads that are no longer used as slides (unless something else shows them).
  const kept = new Set(heroSlides.map((g) => g.key).filter(Boolean));
  for (const g of previous.heroSlides) if (g.key && !kept.has(g.key)) await releaseImage(g.key, g.url);
  return { ok: "Saved. The store is updated." };
}


/* ---------- Password help for clients (works without email) ---------- */

export type ResetLinkState = { link?: string; error?: string } | undefined;

export async function createUserResetLink(_: ResetLinkState, formData: FormData): Promise<ResetLinkState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!ObjectId.isValid(id)) return { error: "Unknown user." };
  const token = await createResetToken(new ObjectId(id));
  if (!token) return { error: "Too many links requested for this account in the last hour." };
  return { link: `${await siteUrl()}/reset-password?token=${token}` };
}
