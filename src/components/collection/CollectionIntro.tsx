import Link from "next/link";
import type { ProductCategory } from "@/lib/products";
import CategoryPills from "./CategoryPills";

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
        <span className="text-primary font-semibold">Footwear All</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-end pb-space-lg">
        <div className="lg:col-span-8 space-y-space-sm">
          <span className="inline-flex items-center gap-space-xs px-space-sm py-1 bg-secondary-container/40 text-on-secondary-container font-label-uppercase text-label-uppercase tracking-[0.2em] uppercase rounded-full">
            Florence Atelier • Spring / Summer 2025
          </span>
          <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight">
            The Spring Atelier Collection 2025
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl leading-relaxed">
            Discover {total} handcrafted silhouettes sculpted in Tuscany. From
            midnight galas to sunlit coastal verandas, each heel balances
            architectural balance with buttery Italian leather.
          </p>
        </div>
        <div className="lg:col-span-4 flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-end gap-space-sm">
          <div className="flex items-center gap-space-sm bg-surface-container-low px-space-md py-space-sm rounded-full shadow-sm">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              verified
            </span>
            <span className="font-body-sm text-body-sm text-on-surface font-medium">
              Bespoke Fitting Guarantee • 100% Calf &amp; Silk
            </span>
          </div>
          <p className="font-label-uppercase text-label-uppercase text-outline tracking-wider uppercase">
            Curated by Creative Director Camille Moreau
          </p>
        </div>
      </div>

      <CategoryPills counts={counts} total={total} />
    </section>
  );
}
