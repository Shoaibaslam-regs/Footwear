"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { CODE_RX, couponTypes, normaliseCode } from "@/lib/coupons";
import { coupons, type CouponDoc } from "@/lib/server/coupons";
import { getDb } from "@/lib/server/db";

export type CouponFormState = { errors?: Record<string, string[] | undefined>; message?: string } | undefined;

const whole = (label: string) =>
  z.coerce.number({ error: `${label} must be a number.` }).int(`${label} must be a whole number.`).min(0, `${label} cannot be negative.`);
const optionalWhole = (label: string) =>
  z.preprocess((v) => (v === "" || v === null || v === undefined ? null : v), whole(label).nullable());
/** "YYYY-MM-DD" from a date input, read as a Pakistan calendar day. */
const day = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? null : v),
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a date.").nullable(),
);

const schema = z
  .object({
    code: z
      .string()
      .transform(normaliseCode)
      .pipe(z.string().regex(CODE_RX, "Use 3–24 letters, numbers or hyphens, e.g. EID20.")),
    type: z.enum(couponTypes, "Choose a coupon type."),
    value: whole("Value"),
    maxDiscount: optionalWhole("Maximum discount"),
    maxPairs: optionalWhole("Pairs"),
    minOrder: optionalWhole("Minimum order"),
    maxUses: optionalWhole("Total uses"),
    perCustomer: z.coerce.number().int("Uses per customer must be a whole number.").min(1, "Allow at least 1 use per customer.").max(100),
    fullPriceOnly: z.boolean(),
    active: z.boolean(),
    public: z.boolean(),
    startsAt: day,
    endsAt: day,
    minPercent: z.coerce.number().int("Use whole percents.").min(1, "The lowest percent must be at least 1.").max(90, "Keep percents at 90 or below."),
    maxPercent: z.coerce.number().int("Use whole percents.").min(1, "The highest percent must be at least 1.").max(90, "Keep percents at 90 or below."),
  })
  .superRefine((d, ctx) => {
    if (d.type === "percent" && (d.value < 1 || d.value > 90)) ctx.addIssue({ code: "custom", path: ["value"], message: "Use a percentage from 1 to 90." });
    if (d.type === "fixed" && d.value < 1) ctx.addIssue({ code: "custom", path: ["value"], message: "Enter the amount off in PKR." });
    if (d.maxPairs !== null && (d.maxPairs < 1 || d.maxPairs > 20)) ctx.addIssue({ code: "custom", path: ["maxPairs"], message: "Use 1 to 20 pairs, or choose the whole bag." });
    if (d.maxUses === 0) ctx.addIssue({ code: "custom", path: ["maxUses"], message: "Leave blank for unlimited, or enter 1 or more." });
    if (d.type === "random" && d.maxPercent < d.minPercent) ctx.addIssue({ code: "custom", path: ["maxPercent"], message: "The highest percent must be the same as or more than the lowest." });
    if (d.startsAt && d.endsAt && d.endsAt < d.startsAt) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end date is before the start date." });
  });

const startOfDay = (d: string | null) => (d ? new Date(`${d}T00:00:00+05:00`) : null);
const endOfDay = (d: string | null) => (d ? new Date(`${d}T23:59:59.999+05:00`) : null);

export async function saveCoupon(_: CouponFormState, fd: FormData): Promise<CouponFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = schema.safeParse({
    code: String(fd.get("code") ?? ""),
    type: fd.get("type"),
    value: fd.get("type") === "free_delivery" || fd.get("type") === "random" ? 0 : fd.get("value"),
    maxDiscount: fd.get("type") === "percent" || fd.get("type") === "random" ? fd.get("maxDiscount") : null,
    maxPairs: (fd.get("type") === "percent" || fd.get("type") === "random") && fd.get("appliesTo") === "pairs" ? fd.get("maxPairs") : null,
    minOrder: fd.get("minOrder"),
    maxUses: fd.get("maxUses"),
    // A surprise campaign gives each customer one card, used once.
    perCustomer: fd.get("type") === "random" ? 1 : fd.get("perCustomer") || 1,
    minPercent: fd.get("minPercent") || 10,
    maxPercent: fd.get("maxPercent") || 60,
    fullPriceOnly: fd.get("fullPriceOnly") === "on",
    active: fd.get("active") === "on",
    public: fd.get("public") === "on",
    startsAt: fd.get("startsAt"),
    endsAt: fd.get("endsAt"),
  });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, message: "Please fix the highlighted fields." };
  const d = parsed.data;
  const col = await coupons();
  const now = new Date();
  const fields = {
    type: d.type,
    value: d.value,
    maxDiscount: d.maxDiscount,
    maxPairs: d.maxPairs,
    minOrder: d.minOrder,
    maxUses: d.maxUses,
    perCustomer: d.perCustomer,
    fullPriceOnly: d.type === "free_delivery" ? false : d.fullPriceOnly,
    active: d.active,
    public: d.public,
    startsAt: startOfDay(d.startsAt),
    endsAt: endOfDay(d.endsAt),
    ...(d.type === "random" ? { minPercent: d.minPercent, maxPercent: d.maxPercent } : {}),
    updatedAt: now,
  };
  if (id) {
    if (!ObjectId.isValid(id)) return { message: "Unknown coupon." };
    // The code can't change after creation: orders and usage counts refer to it.
    const _id = new ObjectId(id);
    const before = await col.findOne({ _id, campaignId: { $exists: false } });
    if (!before) return { message: "This coupon no longer exists." };
    if (before.type !== d.type && before.uses > 0) return { errors: { type: ["The type can't change once the coupon has been used or cards were given."] } };
    await col.updateOne({ _id }, { $set: fields });
    if (d.type === "random") {
      // Cards already given keep their own percent; the other rules follow the campaign.
      await col.updateMany(
        { campaignId: _id },
        { $set: { maxDiscount: fields.maxDiscount, maxPairs: fields.maxPairs, minOrder: fields.minOrder, fullPriceOnly: fields.fullPriceOnly, startsAt: fields.startsAt, endsAt: fields.endsAt, updatedAt: now } },
      );
    }
  } else {
    if (await col.findOne({ code: d.code })) return { errors: { code: ["This code already exists."] } };
    const doc: CouponDoc = { _id: new ObjectId(), code: d.code, ...fields, uses: 0, createdAt: now };
    try {
      await col.insertOne(doc);
    } catch {
      return { errors: { code: ["This code already exists."] } };
    }
  }
  redirect(`/admin/coupons?saved=${encodeURIComponent(d.code)}`);
}

export async function setCouponActive(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await coupons()).updateOne({ _id: new ObjectId(id) }, { $set: { active: fd.get("active") === "true", updatedAt: new Date() } });
  refresh();
}

/**
 * Deletes a coupon, used or not. Past orders keep their own copy of the code
 * and discount (and stay findable on the Orders page). A surprise campaign takes
 * the cards it gave out with it. Bags that still had the code applied lose it.
 */
export async function deleteCoupon(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  const col = await coupons();
  const db = await getDb();
  const c = await col.findOne({ _id: new ObjectId(id), campaignId: { $exists: false } });
  if (!c) return;
  const cards = c.type === "random" ? await col.find({ campaignId: c._id }, { projection: { _id: 1, code: 1 } }).toArray() : [];
  const ids = [c._id, ...cards.map((x) => x._id)];
  const codes = [c.code, ...cards.map((x) => x.code)];
  await col.deleteMany({ _id: { $in: ids } });
  await db.collection("coupon_redemptions").deleteMany({ couponId: { $in: ids } });
  await db.collection("carts").updateMany({ coupon: { $in: codes } }, { $unset: { coupon: "" } });
  redirect(`/admin/coupons?deleted=${encodeURIComponent(c.code)}`);
}
