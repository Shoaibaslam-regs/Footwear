"use client";

import { useState } from "react";
import {
  activeChips,
  heelProfiles,
  materialGroups,
  matches,
  resetFilters,
  toggle,
  updateFilters,
  type FilterableProduct,
  type Filters,
} from "@/lib/catalog-filters";
import { ALL_SIZES, productCategories } from "@/lib/products";
import Price from "@/components/Price";
import SizeGuideLink from "@/components/SizeGuideLink";
import { useDialog } from "@/components/header/useDialog";

const sectionTitle =
  "font-label-uppercase text-[10px] sm:text-[11px] text-primary uppercase tracking-[0.2em] font-medium whitespace-nowrap";
/** The price slider: PKR 500 to 10,000 in steps of 500. The top end means "10,000 and above". */
const PRICE_STEP = 500;
const PRICE_MIN = 500;
const PRICE_MAX = 10_000;

/**
 * Catalog filters. Desktop (lg+): sticky sidebar, toggled by `desktopOpen`.
 * Mobile: bottom sheet that slides up while `mobileOpen`.
 */
export default function FilterSidebar({
  products,
  filters: f,
  resultCount,
  desktopOpen,
  mobileOpen,
  onCloseMobile,
}: {
  products: FilterableProduct[];
  filters: Filters;
  resultCount: number;
  desktopOpen: boolean;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}) {
  const sheetRef = useDialog<HTMLElement>(mobileOpen, onCloseMobile);
  const chips = activeChips(f);

  // Count matches for each option while ignoring that option's own facet.
  const count = (skip: Parameters<typeof matches>[2], extra: (p: FilterableProduct) => boolean) =>
    products.filter((p) => matches(p, f, skip) && extra(p)).length;

  const floor = PRICE_MIN;
  const ceil = PRICE_MAX;
  const lo = Math.max(floor, Math.min(f.minPrice ?? floor, ceil));
  const hi = Math.min(ceil, Math.max(f.maxPrice ?? ceil, floor));
  const onSaleCount = count({ onSale: true }, (p) => !!p.discountPercent);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-[60] bg-primary/40 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onCloseMobile}
      />

      <aside
        ref={sheetRef}
        aria-label="Filters"
        aria-modal={mobileOpen ? true : undefined}
        id="filterSidebar"
        role={mobileOpen ? "dialog" : undefined}
        className={[
          // Mobile: bottom sheet
          "fixed inset-x-0 bottom-0 z-[61] max-h-[85vh] flex flex-col bg-surface rounded-t-2xl shadow-2xl",
          // visibility flips after the slide-out so the sheet animates closed
          "transition-[transform,visibility] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          mobileOpen ? "translate-y-0" : "translate-y-full invisible",
          // Desktop: sticky sidebar
          "lg:visible lg:translate-y-0 lg:static lg:z-auto lg:max-h-none lg:rounded-none lg:shadow-none lg:bg-transparent lg:col-span-3 lg:sticky lg:top-36",
          desktopOpen ? "lg:flex" : "lg:hidden",
        ].join(" ")}
      >
        {/* Sheet handle + header (mobile) */}
        <div className="lg:hidden pt-space-sm pb-space-xs px-space-lg">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-outline-variant" />
          <div className="flex items-center justify-between pt-space-md">
            <h2 className="font-headline-sm text-headline-sm text-primary">Filters</h2>
            <button
              aria-label="Close filters"
              className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors"
              onClick={onCloseMobile}
              type="button"
            >
              <span className="material-symbols-outlined text-[22px]">close</span>
            </button>
          </div>
        </div>

        <div className={`${mobileOpen ? "sheet-content " : ""}flex-1 overflow-y-auto overscroll-contain px-space-md sm:px-space-lg pb-space-md lg:pt-space-sm divide-y divide-outline-variant/40`}>
          {/* Active filters: only when there are some, as small removable tags. */}
          {chips.length > 0 && (
            <div className="py-space-md flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className={sectionTitle}>Selected</span>
                <button className="font-label-uppercase text-[10px] text-secondary underline underline-offset-4 uppercase tracking-[0.14em]" onClick={resetFilters} type="button">
                  Clear all
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {chips.map((chip) => (
                  <button
                    key={chip.label}
                    aria-label={`Remove ${chip.label}`}
                    className="h-8 inline-flex items-center gap-1 pl-2.5 pr-1.5 bg-primary text-on-primary font-label-uppercase text-[10px] uppercase tracking-[0.12em]"
                    onClick={() => updateFilters(chip.remove)}
                    type="button"
                  >
                    {chip.label}
                    <span aria-hidden="true" className="material-symbols-outlined text-[14px]">
                      close
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* EU Size */}
          <fieldset className="py-space-md">
            <div className="flex items-center justify-between gap-2">
              <legend className={sectionTitle}>EU Size</legend>
              <SizeGuideLink className="text-[10px] uppercase tracking-[0.14em] text-secondary underline underline-offset-4 font-label-uppercase">
                Size Guide
              </SizeGuideLink>
            </div>
            <div className="mt-2.5 grid grid-cols-4 sm:grid-cols-7 lg:grid-cols-4 gap-1.5">
              {ALL_SIZES.map((s) => {
                const active = f.sizes.includes(s);
                const available = count({ sizes: true }, (p) => p.inStockSizes.includes(s)) > 0;
                return (
                  <button
                    key={s}
                    aria-label={`EU ${s}${available ? "" : ", sold out"}`}
                    aria-pressed={active}
                    className={`h-11 lg:h-10 text-[13px] transition-colors ${
                      active
                        ? "bg-primary text-on-primary"
                        : available
                          ? "ring-1 ring-inset ring-outline-variant/70 hover:ring-primary text-on-surface"
                          : "text-outline/60 cursor-not-allowed line-through"
                    }`}
                    disabled={!available && !active}
                    onClick={() => updateFilters({ sizes: toggle(f.sizes, s) })}
                    type="button"
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Category */}
          <fieldset className="py-space-md">
            <legend className={`${sectionTitle} float-left w-full`}>Category</legend>
            <div className="clear-both pt-1 flex flex-col font-body-sm text-[14px] text-on-surface-variant">
              {productCategories.map((c) => {
                const n = count({ categories: true }, (p) => p.category === c.value);
                const checked = f.categories.includes(c.value);
                return (
                  <label
                    key={c.value}
                    className={`flex items-center justify-between min-h-10 cursor-pointer group ${!n && !checked ? "opacity-50" : ""}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        checked={checked}
                        className="accent-primary w-4 h-4 cursor-pointer"
                        onChange={() => updateFilters({ categories: toggle(f.categories, c.value) })}
                        type="checkbox"
                      />
                      <span className="group-hover:text-primary transition-colors">{c.label}</span>
                    </span>
                    <span className="text-outline text-xs">{n}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Price Range */}
          {ceil > floor && (
            <div className="py-space-md"><PriceRange ceil={ceil} floor={floor} hi={hi} lo={lo} /></div>
          )}

          {/* Heel Height */}
          <fieldset className="py-space-md">
            <legend className={`${sectionTitle} float-left w-full`}>Heel Height</legend>
            <div className="clear-both pt-2.5 grid grid-cols-2 lg:grid-cols-1 gap-1.5">
              {heelProfiles.map((h) => {
                const active = f.heels.includes(h.value);
                const n = count({ heels: true }, (p) => p.heelMm !== null && h.test(p.heelMm));
                return (
                  <button
                    key={h.value}
                    aria-pressed={active}
                    className={`min-h-10 px-space-sm py-2 font-body-sm text-[12px] text-left transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      active ? "bg-primary text-on-primary" : "ring-1 ring-inset ring-outline-variant/70 hover:ring-primary text-on-surface"
                    }`}
                    disabled={!n && !active}
                    onClick={() => updateFilters({ heels: toggle(f.heels, h.value) })}
                    type="button"
                  >
                    {h.label} <span className="opacity-60">({n})</span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Craft & Material */}
          <fieldset className="py-space-md">
            <legend className={`${sectionTitle} float-left w-full`}>Material</legend>
            <div className="clear-both pt-1 flex flex-col font-body-sm text-[14px] text-on-surface-variant">
              {materialGroups.map((m) => {
                const checked = f.materials.includes(m.value);
                const n = count({ materials: true }, (p) => m.rx.test(p.material));
                return (
                  <label
                    key={m.value}
                    className={`flex items-center justify-between min-h-10 cursor-pointer ${!n && !checked ? "opacity-50" : ""}`}
                  >
                    <span className="flex items-center gap-2.5">
                      <input
                        checked={checked}
                        className="accent-primary w-4 h-4 cursor-pointer"
                        onChange={() => updateFilters({ materials: toggle(f.materials, m.value) })}
                        type="checkbox"
                      />
                      <span>{m.label}</span>
                    </span>
                    <span className="text-outline text-xs">{n}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* On sale */}
          <label className={`py-space-md flex items-center justify-between min-h-10 cursor-pointer font-body-sm text-body-sm text-on-surface-variant ${!onSaleCount && !f.onSale ? "opacity-50" : ""}`}>
            <span className="flex items-center gap-space-xs">
              <input
                checked={f.onSale}
                className="accent-primary w-4 h-4 cursor-pointer"
                onChange={() => updateFilters({ onSale: !f.onSale })}
                type="checkbox"
              />
              <span className={sectionTitle}>On Sale Only</span>
            </span>
            <span className="text-outline text-xs">{onSaleCount}</span>
          </label>
        </div>

        {/* Mobile footer */}
        <div className="lg:hidden flex gap-2 px-space-md pt-space-sm border-t border-outline-variant/40 bg-surface pb-[max(var(--spacing-space-sm),env(safe-area-inset-bottom))]">
          <button
            className="h-12 px-space-md ring-1 ring-inset ring-outline-variant text-primary font-label-uppercase text-[11px] uppercase tracking-[0.14em] disabled:opacity-40"
            disabled={chips.length === 0}
            onClick={resetFilters}
            type="button"
          >
            Reset
          </button>
          <button
            className="flex-1 h-12 bg-primary text-on-primary font-label-uppercase text-[11px] uppercase tracking-[0.18em]"
            onClick={onCloseMobile}
            type="button"
          >
            Show {resultCount} {resultCount === 1 ? "Result" : "Results"}
          </button>
        </div>
      </aside>
    </>
  );
}

/**
 * Two-thumb price slider built from a pair of overlaid range inputs.
 * Moves locally while dragging and applies the filter on release.
 */
function PriceRange({ floor, ceil, lo, hi }: { floor: number; ceil: number; lo: number; hi: number }) {
  const [range, setRange] = useState({ lo, hi });
  const [synced, setSynced] = useState({ lo, hi });
  if (synced.lo !== lo || synced.hi !== hi) {
    // Filters changed elsewhere (chip removed, reset, back button).
    setSynced({ lo, hi });
    setRange({ lo, hi });
  }
  const commit = () =>
    updateFilters({
      minPrice: range.lo <= floor ? null : range.lo,
      maxPrice: range.hi >= ceil ? null : range.hi,
    });
  const pct = (v: number) => ((v - floor) / (ceil - floor)) * 100;
  const thumb =
    "absolute inset-0 w-full appearance-none bg-transparent pointer-events-none focus:outline-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-0 focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-secondary";
  const handlers = { onKeyUp: commit, onPointerUp: commit, onTouchEnd: commit };

  return (
    <fieldset className="space-y-space-xs">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <legend className={sectionTitle}>Price</legend>
        <span aria-live="polite" className="font-body-sm text-xs font-semibold text-primary whitespace-nowrap">
          <Price amount={range.lo} /> – <Price amount={range.hi} />
          {range.hi >= ceil && "+"}
        </span>
      </div>
      <div className="relative h-6 mt-2">
        <div className="absolute top-1/2 -translate-y-1/2 inset-x-0 h-1 rounded-full bg-surface-container-highest" />
        <div
          className="absolute top-1/2 -translate-y-1/2 h-1 rounded-full bg-primary"
          style={{ left: `${pct(range.lo)}%`, right: `${100 - pct(range.hi)}%` }}
        />
        <input
          aria-label="Minimum price"
          className={thumb}
          max={ceil}
          min={floor}
          onChange={(e) => setRange((r) => ({ ...r, lo: Math.min(Number(e.target.value), r.hi - PRICE_STEP) }))}
          step={PRICE_STEP}
          type="range"
          value={range.lo}
          {...handlers}
        />
        <input
          aria-label="Maximum price"
          className={thumb}
          max={ceil}
          min={floor}
          onChange={(e) => setRange((r) => ({ ...r, hi: Math.max(Number(e.target.value), r.lo + PRICE_STEP) }))}
          step={PRICE_STEP}
          type="range"
          value={range.hi}
          {...handlers}
        />
      </div>
      <div className="flex justify-between text-outline text-[11px]">
        <span>
          <Price amount={floor} />
        </span>
        <span>
          <Price amount={ceil} />+
        </span>
      </div>
    </fieldset>
  );
}
