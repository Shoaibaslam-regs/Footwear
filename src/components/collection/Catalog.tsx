"use client";

import { Suspense, useCallback, useState } from "react";
import FiltersUrlSync from "./FiltersUrlSync";
import {
  activeChips,
  matches,
  PAGE_SIZE,
  resetFilters,
  sortOptions,
  sortProducts,
  updateFilters,
  useFilters,
  type FilterableProduct,
  type SortOption,
} from "@/lib/catalog-filters";
import FilterSidebar from "./FilterSidebar";
import CatalogProductCard from "./CatalogProductCard";
import Pagination from "./Pagination";
import QuickViewModal, { type QuickViewState } from "./QuickViewModal";

const densityActive = "bg-surface-container-lowest text-primary shadow-sm";
const densityIdle = "text-on-surface-variant hover:text-primary";

export default function Catalog({ products }: { products: FilterableProduct[] }) {
  const filters = useFilters();
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const closeSheet = useCallback(() => setSheetOpen(false), []);

  const results = sortProducts(products.filter((p) => matches(p, filters)), filters.sort);
  const pages = Math.max(1, Math.ceil(results.length / PAGE_SIZE));
  const page = Math.min(filters.page, pages);
  const visible = results.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const activeCount = activeChips(filters).length;

  const goToPage = (n: number) => {
    updateFilters({ page: n });
    document.getElementById("catalog-grid")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const [columns, setColumns] = useState<3 | 4>(4);
  const [quickView, setQuickView] = useState<QuickViewState | null>(null);
  const closeQuickView = useCallback(() => setQuickView(null), []);

  return (
    <>
      {/* Filter & Utility Control Bar */}
      <section className="w-full bg-surface-container-lowest shadow-sm sticky top-20 z-40">
        <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-sm flex flex-wrap items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            {[
              // Mobile opens the bottom sheet; desktop toggles the sidebar.
              { cls: "flex lg:hidden", expanded: sheetOpen, onClick: () => setSheetOpen(true) },
              { cls: "hidden lg:flex", expanded: filtersOpen, onClick: () => setFiltersOpen((o) => !o) },
            ].map((b) => (
              <button
                key={b.cls}
                aria-controls="filterSidebar"
                aria-expanded={b.expanded}
                className={`${b.cls} items-center gap-space-xs px-space-md py-2 bg-surface-container hover:bg-surface-container-high text-on-surface font-label-uppercase text-label-uppercase uppercase tracking-wider rounded-full transition-colors`}
                onClick={b.onClick}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">tune</span>
                <span>Filters</span>
                {activeCount > 0 && (
                  <span className="w-5 h-5 bg-primary text-on-primary rounded-full text-[10px] flex items-center justify-center ml-1">
                    {activeCount}
                  </span>
                )}
              </button>
            ))}
            <span aria-live="polite" className="font-body-sm text-body-sm text-on-surface-variant hidden sm:inline">
              Showing <span className="font-semibold text-primary">{results.length}</span>{" "}
              of {products.length} pieces
            </span>
          </div>
          <div className="flex items-center gap-space-lg">
            {/* Layout density view switch */}
            <div className="hidden md:flex items-center bg-surface-container p-1 rounded-full">
              <button
                aria-pressed={columns === 3}
                className={`p-1.5 rounded-full transition-colors ${
                  columns === 3 ? densityActive : densityIdle
                }`}
                onClick={() => setColumns(3)}
                title="3-Column Editorial"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  view_agenda
                </span>
              </button>
              <button
                aria-pressed={columns === 4}
                className={`p-1.5 rounded-full transition-colors ${
                  columns === 4 ? densityActive : densityIdle
                }`}
                onClick={() => setColumns(4)}
                title="4-Column Grid"
                type="button"
              >
                <span className="material-symbols-outlined text-[20px]">
                  grid_view
                </span>
              </button>
            </div>
            {/* Sort Control */}
            <div className="flex items-center gap-space-xs">
              <span className="font-label-uppercase text-label-uppercase text-outline uppercase tracking-wider hidden sm:inline">
                Sort:
              </span>
              <div className="relative">
                <select
                  aria-label="Sort products"
                  onChange={(e) => updateFilters({ sort: e.target.value as SortOption })}
                  value={filters.sort}
                  className="appearance-none bg-surface-container py-2 pl-space-md pr-space-lg font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface rounded-full cursor-pointer focus:outline-none focus:bg-surface-container-high transition-colors"
                >
                  {sortOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span className="material-symbols-outlined absolute right-space-sm top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant text-[18px]">
                  expand_more
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Catalog Space: Left Sidebar + Product Grid */}
      <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-start">
          <FilterSidebar
            desktopOpen={filtersOpen}
            filters={filters}
            mobileOpen={sheetOpen}
            onCloseMobile={closeSheet}
            products={products}
            resultCount={results.length}
          />

          <div className={`scroll-mt-40 ${filtersOpen ? "lg:col-span-9" : "lg:col-span-12"}`} id="catalog-grid">
            <div
              className={`grid grid-cols-2 ${
                columns === 4 ? "lg:grid-cols-4" : "lg:grid-cols-3"
              } gap-space-sm sm:gap-gutter`}
            >
              {products.length === 0 && (
                <p className="col-span-full font-body-md text-body-md text-on-surface-variant">
                  New pieces are being prepared in the atelier. Please check back soon.
                </p>
              )}
              {products.length > 0 && results.length === 0 && (
                <div className="col-span-full bg-surface-container-lowest rounded-xl shadow-sm p-space-xl flex flex-col items-center text-center gap-space-md">
                  <span className="material-symbols-outlined text-secondary text-[40px]">filter_alt_off</span>
                  <h2 className="font-headline-sm text-headline-sm text-primary">No pieces match these filters</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Try removing a filter or widening the price range.</p>
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
              <Pagination
                onPage={goToPage}
                page={page}
                pages={pages}
                pageSize={PAGE_SIZE}
                total={results.length}
              />
            )}
          </div>
        </div>
      </section>

      <QuickViewModal state={quickView} onClose={closeQuickView} />
      <Suspense fallback={null}>
        <FiltersUrlSync />
      </Suspense>
    </>
  );
}
