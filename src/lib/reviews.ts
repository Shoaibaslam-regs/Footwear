/** Customer reviews: shared types (safe to import anywhere). */

export const fitOptions = [
  { value: "small", label: "Runs small" },
  { value: "true", label: "True to size" },
  { value: "large", label: "Runs large" },
] as const;
export type Fit = (typeof fitOptions)[number]["value"];

export const reviewStatuses = ["published", "hidden"] as const;
export type ReviewStatus = (typeof reviewStatuses)[number];

/** What visitors see (no user id or email). */
export type PublicReview = {
  id: string;
  name: string;
  rating: number;
  title: string;
  body: string;
  fit: Fit;
  size: number | null;
  verified: boolean;
  photos: ReviewPhoto[];
  createdAt: string;
};

export type ReviewPhoto = { url: string; key: string };
export const MAX_REVIEW_PHOTOS = 3;

export type ReviewSummary = {
  count: number;
  /** 0 when there are no reviews. */
  average: number;
  /** Index 0 = 1 star … index 4 = 5 stars. */
  distribution: [number, number, number, number, number];
  fit: Record<Fit, number>;
};

export const EMPTY_SUMMARY: ReviewSummary = {
  count: 0,
  average: 0,
  distribution: [0, 0, 0, 0, 0],
  fit: { small: 0, true: 0, large: 0 },
};

/** "Ayesha Khan" → "Ayesha K." */
export function displayName(full: string) {
  const parts = full.trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || "Client";
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

/**
 * "12 Nov 2026" in Pakistan time. A fixed date, not "2 days ago": product
 * pages are prerendered, and reading the current time there is not allowed.
 */
export function reviewDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });
}
