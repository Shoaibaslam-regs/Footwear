import Link from "next/link";
import type { ProductCategory } from "@/lib/products";
import CategoryPills from "./CategoryPills";
import { collectionIntro } from "@/lib/collection-data";

export default function CollectionIntro({
  counts,
  total,
}: {
  counts: Record<ProductCategory, number>;
  total: number;
}) {
  return (
    <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-lg">
      <nav
        aria-label="Breadcrumb"
        className="flex items-center gap-space-xs font-label-uppercase text-label-uppercase text-outline mb-space-md tracking-widest uppercase"
      >
        <Link className="hover:text-on-surface transition-colors" href="/">
          Home
        </Link>
        <span className="text-outline-variant">/</span>
        <Link
          className="hover:text-on-surface transition-colors"
          href="/collections"
        >
          Collections
        </Link>
        <span className="text-outline-variant">/</span>
        <span className="text-primary font-semibold">All Shoes</span>
      </nav>

      {/* Heading with the promise badge on its right (one line, phones too), then the sentence. */}
      <div className="pb-space-md sm:pb-space-lg space-y-space-xs sm:space-y-space-sm">
        <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 sm:gap-x-space-lg">
          <h1 className="min-w-0 font-headline-sm text-[24px] leading-tight min-[390px]:text-[26px] sm:font-headline-lg-mobile sm:text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight font-normal whitespace-nowrap">
            {collectionIntro.title}
          </h1>
          <span className="shrink-0 inline-flex items-center gap-1 sm:gap-space-sm bg-surface-container-low px-2 py-1 sm:px-space-md sm:py-space-sm rounded-full shadow-sm whitespace-nowrap">
            <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[12px] sm:text-[20px]">verified</span>
            <span className="font-label-uppercase text-[8px] leading-none tracking-wide uppercase text-on-surface sm:font-body-sm sm:text-body-sm sm:leading-normal sm:normal-case sm:tracking-normal sm:font-medium">
              Perfect Fit Promise
            </span>
          </span>
        </div>
        <p className="font-body-sm text-[13px] sm:font-body-lg sm:text-body-lg text-on-surface-variant font-light">
          <span className="sm:hidden">{collectionIntro.lineShort}</span>
          <span className="hidden sm:inline">{collectionIntro.line}</span>
        </p>
      </div>

      <CategoryPills counts={counts} total={total} />
    </section>
  );
}
