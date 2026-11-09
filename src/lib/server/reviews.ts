import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { ObjectId } from "mongodb";
import {
  EMPTY_SUMMARY,
  type Fit,
  type PublicReview,
  type ReviewStatus,
  type ReviewSummary,
} from "../reviews";
import { getDb } from "./db";

export const REVIEWS_TAG = "reviews";
export const reviewsTag = (slug: string) => `reviews:${slug}`;

export type ReviewDoc = {
  _id: ObjectId;
  productSlug: string;
  userId: ObjectId;
  name: string;
  rating: number;
  title: string;
  body: string;
  fit: Fit;
  size: number | null;
  verified: boolean;
  photos?: { url: string; key: string }[];
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
};

const reviews = async () => (await getDb()).collection<ReviewDoc>("reviews");

const toPublic = (d: ReviewDoc): PublicReview => ({
  id: d._id.toHexString(),
  name: d.name,
  rating: d.rating,
  title: d.title,
  body: d.body,
  fit: d.fit,
  size: d.size,
  verified: d.verified,
  photos: d.photos ?? [],
  createdAt: d.createdAt.toISOString(),
});

/* ---------- Storefront (cached; refreshed with updateTag) ---------- */

export async function getProductReviews(
  slug: string,
): Promise<{ summary: ReviewSummary; reviews: PublicReview[] }> {
  "use cache";
  cacheTag(REVIEWS_TAG, reviewsTag(slug));
  cacheLife("hours");
  const docs = await (await reviews())
    .find({ productSlug: slug, status: "published" })
    .sort({ createdAt: -1 })
    .limit(200)
    .toArray();
  return { summary: summarise(docs), reviews: docs.map(toPublic) };
}

/** Average + count per product, for cards and listings. */
export async function getRatingsBySlug(): Promise<Record<string, { average: number; count: number }>> {
  "use cache";
  cacheTag(REVIEWS_TAG);
  cacheLife("hours");
  const rows = await (await reviews())
    .aggregate<{ _id: string; average: number; count: number }>([
      { $match: { status: "published" } },
      { $group: { _id: "$productSlug", average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ])
    .toArray();
  return Object.fromEntries(rows.map((r) => [r._id, { average: Math.round(r.average * 10) / 10, count: r.count }]));
}

function summarise(docs: Pick<ReviewDoc, "rating" | "fit">[]): ReviewSummary {
  if (docs.length === 0) return EMPTY_SUMMARY;
  const distribution: ReviewSummary["distribution"] = [0, 0, 0, 0, 0];
  const fit: ReviewSummary["fit"] = { small: 0, true: 0, large: 0 };
  let total = 0;
  for (const d of docs) {
    distribution[d.rating - 1]++;
    fit[d.fit]++;
    total += d.rating;
  }
  return { count: docs.length, average: Math.round((total / docs.length) * 10) / 10, distribution, fit };
}

/* ---------- Signed-in client ---------- */

export async function getUserReview(slug: string, userId: string) {
  if (!ObjectId.isValid(userId)) return null;
  const doc = await (await reviews()).findOne({ productSlug: slug, userId: new ObjectId(userId) });
  return doc ? { ...toPublic(doc), status: doc.status } : null;
}

/** True when the client has a delivered order containing this product. */
export async function hasPurchased(userId: string, slug: string) {
  if (!ObjectId.isValid(userId)) return false;
  const n = await (await getDb())
    .collection("orders")
    .countDocuments({ userId: new ObjectId(userId), status: "delivered", "items.slug": slug }, { limit: 1 });
  return n > 0;
}

/* ---------- Admin (callers must requireAdmin first) ---------- */

export type AdminReview = PublicReview & { productSlug: string; status: ReviewStatus; email: string };

export async function listReviews(opts: { status?: ReviewStatus; rating?: number; q?: string } = {}): Promise<AdminReview[]> {
  const filter: Record<string, unknown> = {};
  if (opts.status) filter.status = opts.status;
  if (opts.rating) filter.rating = opts.rating;
  if (opts.q) {
    const rx = new RegExp(opts.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ productSlug: rx }, { name: rx }, { title: rx }, { body: rx }];
  }
  const docs = await (await reviews())
    .aggregate<ReviewDoc & { user?: { email: string }[] }>([
      { $match: filter },
      { $sort: { createdAt: -1 } },
      { $limit: 500 },
      { $lookup: { from: "users", localField: "userId", foreignField: "_id", as: "user", pipeline: [{ $project: { email: 1 } }] } },
    ])
    .toArray();
  return docs.map((d) => ({ ...toPublic(d), productSlug: d.productSlug, status: d.status, email: d.user?.[0]?.email ?? "(deleted user)" }));
}
