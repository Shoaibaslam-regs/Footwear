"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import FiltersUrlSync from "./FiltersUrlSync";
import {
  activeChips,
  matches,
  PAGE_SIZE,
  resetFilters,
  sortProducts,
  updateFilters,
  useFilters,
  type FilterableProduct,
} from "@/lib/catalog-filters";
import FilterSidebar from "./FilterSidebar";
import { liveCardPrice, useSaleClock } from "@/components/sale/SaleProvider";
import SortMenu from "./SortMenu";
import CatalogProductCard from "./CatalogProductCard";
import dynamic from "next/dynamic";
import type { QuickViewState } from "./QuickViewModal";

// Loaded on first use: most visitors never open quick view.
const QuickViewModal = dynamic(() => import("./QuickViewModal"), { ssr: false });


export default function Catalog({ products: listed }: { products: FilterableProduct[] }) {
  // Re-priced with any live sale event, so the cards, the "On sale" filter and
  // price sorting all follow it (prices switch when a sale starts or ends).
  const { events, now } = useSaleClock();
  const products = listed.map((p) => {
    const live = liveCardPrice(p, events, now);
    return live.sale
      ? { ...p, price: live.price, compareAt: live.compareAt, discountPercent: live.discountPercent, saleTag: live.sale.tag }
      : p;
  });
  const filters = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const results = sortProducts(products.filter((p) => matches(p, filters)), filters.sort);
  const activeCount = activeChips(filters).length;

  // Infinite scroll, still in pages: the first PAGE_SIZE shoes, then the next
  // batch each time the customer nears the end (photos load as they appear,
  // next/image is lazy). Any filter or sort change starts again from one page.
  // An old ?page=3 link opens with three pages shown.
  const listKey = JSON.stringify({ ...filters, page: 0 });
  const [loaded, setLoaded] = useState({ key: listKey, pages: Math.max(1, filters.page) });
  if (loaded.key !== listKey) setLoaded({ key: listKey, pages: 1 });
  const visible = results.slice(0, loaded.pages * PAGE_SIZE);
  const more = visible.length < results.length;
  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !more) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) setLoaded((l) => ({ ...l, pages: l.pages + 1 }));
      },
      { rootMargin: "0px 0px 800px 0px" }, // a screen ahead, so the next shoes are ready before she gets there
    );
    io.observe(el);
    return () => io.disconnect();
  }, [more, visible.length]);
  const [quickView, setQuickViewRaw] = useState<QuickViewState | null>(null);
  const [quickViewUsed, setQuickViewUsed] = useState(false);
  const setQuickView = (v: QuickViewState | null) => {
    if (v) setQuickViewUsed(true);
    setQuickViewRaw(v);
  };
  const closeQuickView = useCallback(() => setQuickViewRaw(null), []);

  return (
    <>
      {/* One slim sticky bar: Filters, how many shoes, Sort. */}
      <section className="w-full bg-surface/95 backdrop-blur-md border-y border-outline-variant/40 sticky top-20 z-40">
        <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin h-12 sm:h-14 flex items-center justify-between gap-space-sm">
          {[
            // Phones open the bottom sheet; desktop shows or hides the sidebar.
            { cls: "flex lg:hidden", expanded: sheetOpen, onClick: () => setSheetOpen(true) },
            { cls: "hidden lg:flex", expanded: filtersOpen, onClick: () => setFiltersOpen((o) => !o) },
          ].map((b) => (
            <button
              key={b.cls}
              aria-controls="filterSidebar"
              aria-expanded={b.expanded}
              className={`${b.cls} h-9 items-center gap-1.5 px-3 ring-1 ring-inset ring-outline-variant/70 hover:ring-primary text-primary font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.14em] transition-colors`}
              onClick={b.onClick}
              type="button"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
                tune
              </span>
              <span>Filters</span>
              {activeCount > 0 && <span className="text-secondary">· {activeCount}</span>}
            </button>
          ))}
          <span aria-live="polite" className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.14em] text-outline whitespace-nowrap">
            {results.length} {results.length === 1 ? "shoe" : "shoes"}
          </span>
          <SortMenu onChange={(sort) => updateFilters({ sort })} value={filters.sort} />
        </div>
      </section>

      {/* Main Catalog Space: Left Sidebar + Product Grid */}
      <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-md sm:pt-space-lg pb-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <FilterSidebar
            desktopOpen={filtersOpen}
            filters={filters}
            mobileOpen={sheetOpen}
            onCloseMobile={closeSheet}
            products={products}
            resultCount={results.length}
          />

          <div className={`scroll-mt-36 ${filtersOpen ? "lg:col-span-9" : "lg:col-span-12"}`} id="catalog-grid">
            <div className={`grid grid-cols-2 ${filtersOpen ? "lg:grid-cols-3" : "lg:grid-cols-4"} gap-x-3 gap-y-space-lg sm:gap-x-gutter sm:gap-y-space-xl`}>
              {products.length === 0 && (
                <p className="col-span-full font-body-md text-body-md text-on-surface-variant">
                  New styles are coming soon. Please check back later.
                </p>
              )}
              {products.length > 0 && results.length === 0 && (
                <div className="col-span-full bg-surface-container-lowest rounded-xl shadow-sm p-space-xl flex flex-col items-center text-center gap-space-md">
                  <span className="material-symbols-outlined text-secondary text-[40px]">filter_alt_off</span>
                  <h2 className="font-headline-sm text-headline-sm text-primary">No shoes match these filters</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Try removing a filter or changing the price range.</p>
                  <button
                    className="h-12 px-8 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest"
                    onClick={resetFilters}
                    type="button"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
              {visible.map((p) => (
                <CatalogProductCard
                  key={p.name}
                  product={p}
                  onQuickView={(size) => setQuickView({ product: p, size })}
                />
              ))}
            </div>
            {results.length > 0 && (
              <div className="mt-space-xl flex flex-col items-center gap-space-sm" ref={sentinel}>
                <span aria-live="polite" className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-outline">
                  {more ? `Showing ${visible.length} of ${results.length}` : `All ${results.length} ${results.length === 1 ? "shoe" : "shoes"} shown`}
                </span>
                {more && (
                  // Loads by itself on scroll; the button is there for keyboards and if scrolling doesn't trigger it.
                  <button
                    className="h-10 px-space-md ring-1 ring-inset ring-outline-variant/70 hover:ring-primary text-primary font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.16em] transition-colors"
                    onClick={() => setLoaded((l) => ({ ...l, pages: l.pages + 1 }))}
                    type="button"
                  >
                    Show more
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {quickViewUsed && <QuickViewModal state={quickView} onClose={closeQuickView} />}
      <Suspense fallback={null}>
        <FiltersUrlSync />
      </Suspense>
    </>
  );
}
