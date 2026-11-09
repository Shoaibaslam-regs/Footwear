"use server";

import { ObjectId } from "mongodb";
import { updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { displayName, fitOptions, MAX_REVIEW_PHOTOS } from "@/lib/reviews";
import { deleteReviewPhotos, ownedKeys } from "@/lib/server/review-uploads";
import { getDb } from "@/lib/server/db";
import { getPublishedProduct } from "@/lib/server/products";
import { hasPurchased, REVIEWS_TAG, reviewsTag, type ReviewDoc } from "@/lib/server/reviews";
import { addStockAlert } from "@/lib/server/stock-alerts";

export type ReviewFormState =
  | { ok?: string; message?: string; errors?: Record<string, string[] | undefined> }
  | undefined;

const schema = z.object({
  slug: z.string().min(1).max(120),
  rating: z.coerce.number().int().min(1, "Choose a star rating.").max(5),
  title: z.string().trim().min(3, "Add a short headline (3+ characters).").max(80),
  body: z.string().trim().min(20, "Tell other clients a little more (20+ characters).").max(1500),
  fit: z.enum(fitOptions.map((f) => f.value), "Tell us how the size fits."),
  size: z.union([z.literal(""), z.coerce.number().int().min(30).max(46)]),
  photos: z
    .array(z.object({ url: z.url({ protocol: /^https$/ }), key: z.string().regex(/^[\w.-]+$/) }))
    .max(MAX_REVIEW_PHOTOS, `Up to ${MAX_REVIEW_PHOTOS} photos.`),
});

export async function submitReview(_: ReviewFormState, fd: FormData): Promise<ReviewFormState> {
  const user = await getCurrentUser();
  if (!user) return { message: "Please sign in to write a review." };

  const parsed = schema.safeParse({
    slug: fd.get("slug") ?? "",
    rating: fd.get("rating") ?? "0",
    title: fd.get("title") ?? "",
    body: fd.get("body") ?? "",
    fit: fd.get("fit") ?? "",
    size: fd.get("size") ?? "",
    photos: (() => {
      try {
        return JSON.parse(String(fd.get("photos") ?? "[]"));
      } catch {
        return [];
      }
    })(),
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, message: "Please check the highlighted fields." };
  }
  const d = parsed.data;
  if (!(await getPublishedProduct(d.slug))) return { message: "This product is no longer available." };

  const now = new Date();
  const userId = new ObjectId(user.id);
  const col = (await getDb()).collection<ReviewDoc>("reviews");
  const existing = await col.findOne({ productSlug: d.slug, userId });
  // Only photos this client uploaded (or already had on this review) are accepted.
  const owned = await ownedKeys(user.id, d.photos.map((p) => p.key));
  const keep = new Set((existing?.photos ?? []).map((p) => p.key));
  const photos = d.photos.filter((p) => (owned.has(p.key) || keep.has(p.key)) && p.url.includes(p.key));
  await col.updateOne(
    { productSlug: d.slug, userId },
    {
      $set: {
        name: displayName(user.name),
        rating: d.rating,
        title: d.title,
        body: d.body,
        fit: d.fit,
        size: d.size === "" ? null : d.size,
        verified: await hasPurchased(user.id, d.slug),
        photos,
        updatedAt: now,
      },
      // A hidden review stays hidden when edited; new ones publish immediately.
      $setOnInsert: { _id: new ObjectId(), status: "published", createdAt: now },
    },
    { upsert: true },
  );
  // Photos dropped while editing are deleted from storage.
  const now2 = new Set(photos.map((p) => p.key));
  await deleteReviewPhotos((existing?.photos ?? []).map((p) => p.key).filter((k) => !now2.has(k)));
  updateTag(reviewsTag(d.slug));
  updateTag(REVIEWS_TAG);
  return {
    ok:
      existing?.status === "hidden"
        ? "Review updated. It is currently hidden by our team."
        : existing
          ? "Your review has been updated."
          : "Thank you, your review is live.",
  };
}

export async function deleteMyReview(fd: FormData) {
  const user = await getCurrentUser();
  const slug = String(fd.get("slug") ?? "");
  if (!user || !slug) return;
  const removed = await (await getDb())
    .collection<ReviewDoc>("reviews")
    .findOneAndDelete({ productSlug: slug, userId: new ObjectId(user.id) });
  await deleteReviewPhotos((removed?.photos ?? []).map((p) => p.key));
  updateTag(reviewsTag(slug));
  updateTag(REVIEWS_TAG);
}

/* ---------- Back-in-stock alerts ---------- */

export async function requestStockAlert(slugValue: string, size: number): Promise<{ ok?: string; error?: string }> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in first." };
  const p = await getPublishedProduct(String(slugValue));
  if (!p || !p.sizes.includes(size)) return { error: "This size isn't offered." };
  if (!p.soldOutSizes.includes(size) && p.stock[String(size)] !== 0) return { error: "Good news: this size is in stock now." };
  await addStockAlert(p.slug, size, user.id, user.email);
  return { ok: `We'll email ${user.email} when EU ${size} is back.` };
}
