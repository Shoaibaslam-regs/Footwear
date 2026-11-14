"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { MAX_DISCOUNT, productCategories, type ProductCategory } from "@/lib/products";
import { saleScopes } from "@/lib/sale-events";
import { getPublishedProducts } from "@/lib/server/products";
import { SALE_EVENTS_TAG, saleEvents, type SaleEventDoc } from "@/lib/server/sale-events";

export type SaleFormState = { errors?: Record<string, string[] | undefined>; message?: string } | undefined;

const pct = (label: string) =>
  z.coerce.number({ error: `${label} must be a number.` }).int("Use whole percents.").min(1, `${label}: at least 1%.`).max(MAX_DISCOUNT, `${label}: ${MAX_DISCOUNT}% at most.`);

/** "YYYY-MM-DDTHH:MM" from a datetime-local input, read as Pakistan time. */
const when = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time.");
const pkt = (v: string) => new Date(`${v}:00+05:00`);

const categoryValues = productCategories.map((c) => c.value) as [ProductCategory, ...ProductCategory[]];

const schema = z
  .object({
    name: z.string().trim().min(2, "Give the sale a name, e.g. 11.11 Sale.").max(40, "Keep the name under 40 characters."),
    tag: z.string().trim().min(1, "Add a short tag, e.g. 11.11.").max(12, "Keep the tag to 12 characters."),
    headline: z.string().trim().max(80, "Keep the line under 80 characters."),
    startsAt: when,
    endsAt: when,
    scope: z.enum(saleScopes, "Choose what is discounted."),
    percent: pct("Percent"),
    categories: z.array(z.enum(categoryValues)),
    items: z.record(z.string(), pct("Percent")),
    countdown: z.boolean(),
    teaser: z.boolean(),
    allowCoupons: z.boolean(),
  })
  .superRefine((d, ctx) => {
    if (pkt(d.endsAt) <= pkt(d.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
    if (d.scope === "categories" && d.categories.length === 0) ctx.addIssue({ code: "custom", path: ["categories"], message: "Tick at least one category." });
    if (d.scope === "items" && Object.keys(d.items).length === 0) ctx.addIssue({ code: "custom", path: ["items"], message: "Give at least one shoe a percent." });
  });

export async function saveSale(_: SaleFormState, fd: FormData): Promise<SaleFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const scope = String(fd.get("scope") ?? "");
  // Hand-picked shoes: "item:<slug>" fields with a percent; blanks are not in the sale.
  const published = new Set((await getPublishedProducts()).map((p) => p.slug));
  const items: Record<string, string> = {};
  for (const [k, v] of fd.entries()) {
    if (k.startsWith("item:") && String(v).trim() !== "" && published.has(k.slice(5))) items[k.slice(5)] = String(v).trim();
  }
  const parsed = schema.safeParse({
    name: String(fd.get("name") ?? ""),
    tag: String(fd.get("tag") ?? ""),
    headline: String(fd.get("headline") ?? ""),
    startsAt: String(fd.get("startsAt") ?? ""),
    endsAt: String(fd.get("endsAt") ?? ""),
    scope,
    percent: scope === "items" ? 1 : fd.get("percent"),
    categories: scope === "categories" ? fd.getAll("categories").map(String) : [],
    items: scope === "items" ? items : {},
    countdown: fd.get("countdown") === "on",
    teaser: fd.get("teaser") === "on",
    allowCoupons: fd.get("allowCoupons") === "on",
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, message: "Please fix the highlighted fields." };
  const d = parsed.data;
  const now = new Date();
  const fields = {
    name: d.name,
    tag: d.tag.toUpperCase(),
    headline: d.headline,
    startsAt: pkt(d.startsAt),
    endsAt: pkt(d.endsAt),
    scope: d.scope,
    percent: d.scope === "items" ? 0 : d.percent,
    categories: d.categories,
    items: d.items,
    countdown: d.countdown,
    teaser: d.teaser,
    allowCoupons: d.allowCoupons,
    updatedAt: now,
  };
  const col = await saleEvents();
  if (id) {
    if (!ObjectId.isValid(id)) return { message: "Unknown sale." };
    const before = await col.findOne({ _id: new ObjectId(id) });
    if (!before) return { message: "This sale no longer exists." };
    if (before.stoppedAt) return { message: "This sale was stopped. Create a new one instead." };
    await col.updateOne({ _id: before._id }, { $set: fields });
  } else {
    const doc: SaleEventDoc = { _id: new ObjectId(), ...fields, stoppedAt: null, createdAt: now };
    await col.insertOne(doc);
  }
  updateTag(SALE_EVENTS_TAG);
  redirect(`/admin/sales?saved=${encodeURIComponent(d.name)}`);
}

/** Ends a sale now: every price goes back at once. It stays in the list as Ended. */
export async function stopSale(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await saleEvents()).updateOne({ _id: new ObjectId(id), stoppedAt: null }, { $set: { stoppedAt: new Date(), updatedAt: new Date() } });
  updateTag(SALE_EVENTS_TAG);
  redirect("/admin/sales?stopped=1");
}

/** Removes a sale from the list. Orders keep their own record of the sale they used. */
export async function deleteSale(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await saleEvents()).deleteOne({ _id: new ObjectId(id) });
  updateTag(SALE_EVENTS_TAG);
  redirect("/admin/sales?deleted=1");
}
