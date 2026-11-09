"use client";

import { useSyncExternalStore } from "react";
import type { CatalogProduct } from "./collection-data";
import { ALL_SIZES, productCategories, type ProductCategory } from "./products";

/* ---------- Options ---------- */

export const heelProfiles = [
  { value: "flat", label: "Flat / Ballet", test: (mm: number) => mm <= 20 },
  { value: "kitten", label: "< 50mm Kitten", test: (mm: number) => mm > 20 && mm < 50 },
  { value: "midi", label: "50–85mm Midi", test: (mm: number) => mm >= 50 && mm <= 85 },
  { value: "high", label: "90mm+ High", test: (mm: number) => mm > 85 },
] as const;
export type HeelProfile = (typeof heelProfiles)[number]["value"];

export const materialGroups = [
  { value: "leather", label: "Calfskin & Nappa Leather", rx: /calf|nappa|leather|patent|tan\b/i },
  { value: "silk", label: "Silk, Satin & Crepe", rx: /silk|satin|crepe|grosgrain/i },
  { value: "suede", label: "Suede & Velour", rx: /suede|velour/i },
  { value: "metallic", label: "Metallic, Foil & Pearl", rx: /metallic|foil|pearl/i },
] as const;
export type MaterialGroup = (typeof materialGroups)[number]["value"];

export const sortOptions = [
  { value: "featured", label: "Featured Atelier" },
  { value: "newest", label: "Newest Arrivals" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "best", label: "Best Selling" },
] as const;
export type SortOption = (typeof sortOptions)[number]["value"];

export const PAGE_SIZE = 12;

/** Storefront card plus the fields filtering needs. */
export type FilterableProduct = CatalogProduct & {
  category: ProductCategory;
  inStockSizes: number[];
  heelMm: number | null;
  createdAt: string;
  bestSeller: boolean;
  newArrival: boolean;
  /** Online orders + other channels. */
  sold?: number;
  rating?: { average: number; count: number };
};

/* ---------- State ---------- */

export type Filters = {
  /** Free-text search over name, material, spec and category. */
  q: string;
  categories: ProductCategory[];
  heels: HeelProfile[];
  sizes: number[];
  materials: MaterialGroup[];
  /** Inclusive PKR bounds (null = open). */
  minPrice: number | null;
  maxPrice: number | null;
  onSale: boolean;
  sort: SortOption;
  page: number;
};

export const EMPTY: Filters = {
  q: "",
  categories: [],
  heels: [],
  sizes: [],
  materials: [],
  minPrice: null,
  maxPrice: null,
  onSale: false,
  sort: "featured",
  page: 1,
};

const isCategory = (v: string): v is ProductCategory => productCategories.some((c) => c.value === v);
const isHeel = (v: string): v is HeelProfile => heelProfiles.some((h) => h.value === v);
const isMaterial = (v: string): v is MaterialGroup => materialGroups.some((m) => m.value === v);
const isSort = (v: string): v is SortOption => sortOptions.some((s) => s.value === v);
const num = (v: string | null) => (v && /^\d+$/.test(v) ? Number(v) : null);

export function fromSearch(search: string): Filters {
  const q = new URLSearchParams(search);
  const list = (k: string) => q.getAll(k).flatMap((v) => v.split(","));
  return {
    q: (q.get("q") ?? "").trim().slice(0, 80),
    categories: list("category").filter(isCategory),
    heels: list("heel").filter(isHeel),
    sizes: list("size").map(Number).filter((n) => (ALL_SIZES as readonly number[]).includes(n)),
    materials: list("material").filter(isMaterial),
    minPrice: num(q.get("min")),
    maxPrice: num(q.get("max")),
    onSale: q.get("sale") === "1",
    sort: isSort(q.get("sort") ?? "") ? (q.get("sort") as SortOption) : "featured",
    page: Math.max(1, num(q.get("page")) ?? 1),
  };
}

export function toSearch(f: Filters): string {
  const q = new URLSearchParams();
  if (f.q) q.set("q", f.q);
  if (f.categories.length) q.set("category", f.categories.join(","));
  if (f.heels.length) q.set("heel", f.heels.join(","));
  if (f.sizes.length) q.set("size", f.sizes.join(","));
  if (f.materials.length) q.set("material", f.materials.join(","));
  if (f.minPrice !== null) q.set("min", String(f.minPrice));
  if (f.maxPrice !== null) q.set("max", String(f.maxPrice));
  if (f.onSale) q.set("sale", "1");
  if (f.sort !== "featured") q.set("sort", f.sort);
  if (f.page > 1) q.set("page", String(f.page));
  const s = q.toString();
  return s ? `?${s}` : "";
}

let state: Filters = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function syncFromUrl() {
  state = fromSearch(window.location.search);
}

function subscribe(listener: () => void) {
  if (!loaded) {
    loaded = true;
    syncFromUrl();
    queueMicrotask(emit);
  }
  listeners.add(listener);
  const onPop = () => {
    syncFromUrl();
    emit();
  };
  window.addEventListener("popstate", onPop);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("popstate", onPop);
  };
}

/** Re-reads the URL (e.g. after a search link navigates to /collections?q=…). */
export function syncFiltersFromUrl() {
  if (!loaded) return;
  const next = fromSearch(window.location.search);
  if (toSearch(next) === toSearch(state)) return;
  state = next;
  emit();
}

export function useFilters(): Filters {
  return useSyncExternalStore(subscribe, () => state, () => EMPTY);
}

/** Applies a change; anything except paging returns to page 1. */
export function updateFilters(change: Partial<Filters>) {
  state = { ...state, ...change, page: "page" in change ? (change.page ?? 1) : 1 };
  const url = `${window.location.pathname}${toSearch(state)}${window.location.hash}`;
  window.history.pushState(window.history.state, "", url);
  emit();
}

export const resetFilters = () => updateFilters({ ...EMPTY, sort: state.sort });

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/* ---------- Matching ---------- */

/** Which facets to skip, so each facet can count matches ignoring itself. */
type Skip = Partial<Record<"categories" | "heels" | "sizes" | "materials" | "price" | "onSale", true>>;

/** Every word must appear in the piece's name, material, spec or category. */
export function matchesText(p: Pick<FilterableProduct, "name" | "material" | "spec" | "tag">, query: string) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const hay = `${p.name} ${p.material} ${p.spec} ${p.tag}`.toLowerCase();
  return terms.every((t) => hay.includes(t));
}

export function matches(p: FilterableProduct, f: Filters, skip: Skip = {}): boolean {
  if (f.q && !matchesText(p, f.q)) return false;
  if (!skip.categories && f.categories.length && !f.categories.includes(p.category)) return false;
  if (!skip.heels && f.heels.length) {
    if (p.heelMm === null) return false;
    if (!heelProfiles.some((h) => f.heels.includes(h.value) && h.test(p.heelMm!))) return false;
  }
  if (!skip.sizes && f.sizes.length && !f.sizes.some((s) => p.inStockSizes.includes(s))) return false;
  if (!skip.materials && f.materials.length) {
    const groups = materialGroups.filter((m) => f.materials.includes(m.value));
    if (!groups.some((m) => m.rx.test(p.material))) return false;
  }
  if (!skip.price) {
    if (f.minPrice !== null && p.price < f.minPrice) return false;
    if (f.maxPrice !== null && p.price > f.maxPrice) return false;
  }
  if (!skip.onSale && f.onSale && !p.discountPercent) return false;
  return true;
}

export function sortProducts(list: FilterableProduct[], sort: SortOption): FilterableProduct[] {
  const byNew = (a: FilterableProduct, b: FilterableProduct) => b.createdAt.localeCompare(a.createdAt);
  const out = [...list];
  switch (sort) {
    case "newest":
      return out.sort(byNew);
    case "price-asc":
      return out.sort((a, b) => a.price - b.price || byNew(a, b));
    case "price-desc":
      return out.sort((a, b) => b.price - a.price || byNew(a, b));
    case "best":
      return out.sort((a, b) => (b.sold ?? 0) - (a.sold ?? 0) || Number(b.bestSeller) - Number(a.bestSeller) || byNew(a, b));
    default:
      // Featured: best sellers, then new arrivals, then newest.
      return out.sort(
        (a, b) =>
          Number(b.bestSeller) - Number(a.bestSeller) ||
          Number(b.newArrival) - Number(a.newArrival) ||
          byNew(a, b),
      );
  }
}

/** Human labels for the active-filter chips, each with a remover. */
export function activeChips(f: Filters): { label: string; remove: Partial<Filters> }[] {
  const chips: { label: string; remove: Partial<Filters> }[] = [];
  if (f.q) chips.push({ label: `“${f.q}”`, remove: { q: "" } });
  for (const c of f.categories)
    chips.push({ label: productCategories.find((x) => x.value === c)!.label, remove: { categories: f.categories.filter((x) => x !== c) } });
  for (const h of f.heels)
    chips.push({ label: heelProfiles.find((x) => x.value === h)!.label, remove: { heels: f.heels.filter((x) => x !== h) } });
  for (const s of f.sizes) chips.push({ label: `EU ${s}`, remove: { sizes: f.sizes.filter((x) => x !== s) } });
  for (const m of f.materials)
    chips.push({ label: materialGroups.find((x) => x.value === m)!.label, remove: { materials: f.materials.filter((x) => x !== m) } });
  if (f.minPrice !== null || f.maxPrice !== null) chips.push({ label: "Price range", remove: { minPrice: null, maxPrice: null } });
  if (f.onSale) chips.push({ label: "On sale", remove: { onSale: false } });
  return chips;
}
