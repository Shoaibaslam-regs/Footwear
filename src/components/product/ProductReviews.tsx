import Link from "next/link";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { fitOptions, reviewDate, type PublicReview, type ReviewSummary } from "@/lib/reviews";
import { getUserReview, hasPurchased } from "@/lib/server/reviews";
import ReviewForm from "./ReviewForm";
import ReviewPhotos from "./ReviewPhotos";
import Stars from "./Stars";

const VISIBLE = 9;

export default function ProductReviews({
  slug,
  sizes,
  summary,
  reviews,
}: {
  slug: string;
  sizes: number[];
  summary: ReviewSummary;
  reviews: PublicReview[];
}) {
  const fitTotal = summary.fit.small + summary.fit.true + summary.fit.large;
  const pct = (n: number) => (fitTotal ? Math.round((n / fitTotal) * 100) : 0);

  return (
    <section
      className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin py-space-xl scroll-mt-28"
      id="reviews-anchor"
    >
      <div className="space-y-space-lg">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-lg">
          <div className="space-y-space-xs">
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              Customer Reviews
            </span>
            <h2 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary font-normal">
              What Customers Say
            </h2>
            {summary.count > 0 ? (
              <div className="flex flex-wrap items-center gap-space-sm pt-space-xs">
                <span className="font-headline-md text-headline-md text-primary font-normal">{summary.average.toFixed(1)}</span>
                <Stars className="text-base" size="text-[20px]" value={summary.average} />
                <span className="font-body-sm text-body-sm text-on-surface-variant font-medium">
                  Based on {summary.count} {summary.count === 1 ? "review" : "reviews"}
                </span>
              </div>
            ) : (
              <p className="font-body-md text-body-md text-on-surface-variant pt-space-xs">
                No reviews yet. Be the first to review this product.
              </p>
            )}
          </div>

          {summary.count > 0 && (
            <div className="grid grid-cols-2 gap-space-sm sm:gap-space-md w-full md:max-w-xl">
              {/* Star distribution */}
              <div className="p-space-md bg-surface-container-low space-y-1">
                {[5, 4, 3, 2, 1].map((n) => {
                  const c = summary.distribution[n - 1];
                  return (
                    <div key={n} className="flex items-center gap-2 font-body-sm text-xs text-on-surface-variant">
                      <span className="w-6">{n}★</span>
                      <div className="flex-1 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-secondary" style={{ width: `${(c / summary.count) * 100}%` }} />
                      </div>
                      <span className="w-6 text-right">{c}</span>
                    </div>
                  );
                })}
              </div>
              {/* Fit gauge from real feedback */}
              <div className="p-space-md bg-surface-container-low space-y-space-xs">
                <div className="flex justify-between items-center font-label-uppercase text-label-uppercase text-[11px] uppercase">
                  <span className="text-primary font-semibold">How It Fits</span>
                  <span className="text-secondary font-medium">{pct(summary.fit.true)}% True to Size</span>
                </div>
                <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden flex">
                  <div className="h-full bg-outline-variant" style={{ width: `${pct(summary.fit.small)}%` }} title="Runs small" />
                  <div className="h-full bg-primary" style={{ width: `${pct(summary.fit.true)}%` }} title="True to size" />
                  <div className="h-full bg-secondary" style={{ width: `${pct(summary.fit.large)}%` }} title="Runs large" />
                </div>
                <div className="flex justify-between text-[10px] font-label-uppercase text-on-surface-variant uppercase gap-2">
                  {fitOptions.map((f) => (
                    <span key={f.value} className={f.value === "true" ? "font-semibold text-primary" : undefined}>
                      {f.label} ({pct(summary.fit[f.value])}%)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Write a review (reads the session, so it streams in) */}
        <div className="p-space-lg bg-surface-container-lowest shadow-sm">
          <h3 className="font-headline-sm text-headline-sm text-primary mb-space-md">Write a Review</h3>
          <Suspense fallback={<div className="h-12 bg-surface-container motion-safe:animate-pulse" />}>
            <ReviewComposer sizes={sizes} slug={slug} />
          </Suspense>
        </div>

        {reviews.length > 0 && (
          <ul className="grid grid-cols-2 md:grid-cols-3 gap-space-sm sm:gap-gutter">
            {reviews.slice(0, VISIBLE).map((r) => (
              <ReviewCard key={r.id} review={r} />
            ))}
          </ul>
        )}
        {reviews.length > VISIBLE && (
          <details className="group">
            <summary className="list-none cursor-pointer inline-flex items-center gap-1 h-11 px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors">
              <span className="group-open:hidden">Show all {reviews.length} reviews</span>
              <span className="hidden group-open:inline">Show fewer</span>
            </summary>
            <ul className="grid grid-cols-2 md:grid-cols-3 gap-space-sm sm:gap-gutter mt-space-md">
              {reviews.slice(VISIBLE).map((r) => (
                <ReviewCard key={r.id} review={r} />
              ))}
            </ul>
          </details>
        )}
      </div>
    </section>
  );
}

function ReviewCard({ review: r }: { review: PublicReview }) {
  const fit = fitOptions.find((f) => f.value === r.fit)?.label;
  return (
    <li className="p-space-sm sm:p-space-lg bg-surface-container-lowest flex flex-col justify-between space-y-space-sm sm:space-y-space-md shadow-sm min-w-0">
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <Stars className="text-sm" size="text-[12px] sm:text-[16px]" value={r.rating} />
          <span className="hidden sm:inline font-label-uppercase text-label-uppercase text-outline text-[10px]">{reviewDate(r.createdAt)}</span>
        </div>
        <h4 className="font-headline-sm text-headline-sm text-primary font-normal">“{r.title}”</h4>
        <p className="font-body-sm text-body-sm text-on-surface-variant whitespace-pre-line line-clamp-5 sm:line-clamp-none">{r.body}</p>
        <ReviewPhotos author={r.name} photos={r.photos} />
      </div>
      <div className="pt-space-sm flex flex-wrap items-center justify-between gap-1 sm:gap-2 font-label-uppercase text-label-uppercase text-[9px] sm:text-[11px] text-on-surface-variant uppercase">
        <span className="font-semibold text-primary">{r.name}</span>
        <span className="text-secondary flex items-center gap-1">
          {[r.size ? `EU ${r.size}` : null, fit].filter(Boolean).join(" • ")}
          {r.verified && (
            <span className="inline-flex items-center gap-0.5 text-primary">
              {" "}
              • <span className="material-symbols-outlined text-[14px] icon-filled text-secondary">verified</span> Verified
            </span>
          )}
        </span>
      </div>
    </li>
  );
}

async function ReviewComposer({ slug, sizes }: { slug: string; sizes: number[] }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant">
        <Link
          className="text-primary underline underline-offset-4 decoration-secondary hover:text-secondary"
          href={`/login?next=${encodeURIComponent(`/products/${slug}#reviews-anchor`)}`}
        >
          Log in
        </Link>{" "}
        to write a review.
      </p>
    );
  }
  const [existing, verified] = await Promise.all([getUserReview(slug, user.id), hasPurchased(user.id, slug)]);
  return (
    <ReviewForm
      existing={
        existing
          ? { rating: existing.rating, title: existing.title, body: existing.body, fit: existing.fit, size: existing.size, status: existing.status, photos: existing.photos }
          : null
      }
      key={existing?.createdAt ?? "new"}
      sizes={sizes}
      slug={slug}
      verified={verified}
    />
  );
}
