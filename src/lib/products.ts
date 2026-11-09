/**
 * Product listing shared between the admin panel (source of truth, MongoDB)
 * and the storefront. Pure types + mappers: safe to import anywhere.
 */
import type { BestSeller, Product as ArrivalCard } from "./data";
import type { FilterableProduct } from "./catalog-filters";
import type { SearchEntry } from "./search-data";

export const productCategories = [
  { value: "heels", label: "Heels" },
  { value: "sandals", label: "Sandals" },
  { value: "flats", label: "Flats & Loafers" },
  { value: "bridal", label: "Bridal & Party" },
] as const;
export type ProductCategory = (typeof productCategories)[number]["value"];

export const productStatuses = ["published", "draft"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const ALL_SIZES = [35, 36, 37, 38, 39, 40, 41] as const;

export const MAX_GALLERY = 6;

/** One product photo. The first photo in a gallery is the cover. */
export type GalleryImage = {
  url: string;
  /** UploadThing file key ("" for pasted URLs). */
  key: string;
  /** Description for screen readers. */
  alt: string;
  /** Optional short label shown on the thumbnail, e.g. "Heel". */
  caption: string;
};

export type Listing = {
  id: string;
  slug: string;
  name: string;
  category: ProductCategory;
  /** e.g. "Sculptural Heel • 95mm" */
  spec: string;
  material: string;
  description: string;
  /** PKR */
  price: number;
  /** Cover photo (always gallery[0]); kept flat for cards, search, bag and orders. */
  image: string;
  imageKey: string;
  alt: string;
  /** 1–6 photos, cover first. */
  gallery: GalleryImage[];
  badge: string;
  sizes: number[];
  /** Derived from `stock` when tracked (sizes at 0); kept for filters and cards. */
  soldOutSizes: number[];
  /** Pairs left per EU size ("38": 4). A size without an entry is not tracked (unlimited). */
  stock: Record<string, number>;
  /** 0–90. The storefront price is `salePrice(listing)`. */
  discountPercent: number;
  /**
   * Pairs sold outside this website (boutique, Instagram/WhatsApp orders,
   * before launch). Added to online orders for the "N sold" figure.
   */
  otherSales: number;
  newArrival: boolean;
  bestSeller: boolean;
  status: ProductStatus;
  createdAt: string;
  updatedAt: string;
};

export const categoryLabel = (c: ProductCategory) =>
  productCategories.find((x) => x.value === c)?.label ?? c;

export const productHref = (p: Pick<Listing, "slug">) => `/products/${p.slug}`;

export const MAX_DISCOUNT = 90;
/** At or below this many pairs a size shows "N left". */
export const LOW_STOCK = 3;

/** Pairs left in a size, or null when that size isn't stock-tracked. */
export function stockLeft(p: Pick<Listing, "stock">, size: number): number | null {
  const n = p.stock?.[String(size)];
  return typeof n === "number" ? n : null;
}

/** Price after the listing's discount, rounded to whole PKR. */
export function salePrice(p: Pick<Listing, "price" | "discountPercent">): number {
  const pct = Math.min(MAX_DISCOUNT, Math.max(0, p.discountPercent || 0));
  return Math.round((p.price * (100 - pct)) / 100);
}

/** Fields every storefront card carries so it can show a sale price. */
export type PriceFields = {
  /** What the customer pays (PKR). */
  price: number;
  /** Original price when discounted. */
  compareAt?: number;
  discountPercent?: number;
};

function priceFields(p: Listing): PriceFields {
  return p.discountPercent > 0
    ? { price: salePrice(p), compareAt: p.price, discountPercent: p.discountPercent }
    : { price: p.price };
}

/* ---------- Storefront view mappers ---------- */

/** First "95mm"-style height in the spec; flats without one count as 0. */
function heelHeight(p: Pick<Listing, "spec" | "category">): number | null {
  const mm = p.spec.match(/(\d{1,3})\s*mm/i);
  if (mm) return Number(mm[1]);
  return p.category === "flats" ? 0 : null;
}

/** Total "sold" figure: online orders + sales from other channels. */
export const soldCount = (p: Pick<Listing, "otherSales">, online = 0) => online + (p.otherSales || 0);

export function toCatalogCard(
  p: Listing,
  extra: { sold?: number; rating?: { average: number; count: number } } = {},
): FilterableProduct & PriceFields & { sold: number; rating?: { average: number; count: number } } {
  const inStock = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
  return {
    sold: soldCount(p, extra.sold),
    rating: extra.rating,
    category: p.category,
    inStockSizes: inStock,
    heelMm: heelHeight(p),
    createdAt: p.createdAt,
    bestSeller: p.bestSeller,
    newArrival: p.newArrival,
    name: p.name,
    href: productHref(p),
    badge: p.badge || undefined,
    badgeClass: "bg-primary text-on-primary",
    spec: p.spec,
    tag: categoryLabel(p.category),
    tagClass: "text-secondary font-medium",
    material: p.material,
    ...priceFields(p),
    swatches: ["bg-primary", "bg-secondary-fixed"],
    quickSizes: inStock.slice(0, 4),
    quickSelected: inStock.includes(38) ? 38 : inStock[0],
    image: p.image,
    alt: p.alt,
  };
}

export function toArrivalCard(p: Listing): ArrivalCard & PriceFields {
  return {
    name: p.name,
    href: productHref(p),
    shortName: p.name.replace(/^The\s+/i, ""),
    badge: p.badge || "New In",
    badgeClass: "bg-primary text-on-primary",
    spec: p.spec,
    ...priceFields(p),
    material: p.material,
    image: p.image,
    alt: p.alt,
    swatches: [],
    moreColors: categoryLabel(p.category),
  };
}

export function toBestSellerCard(p: Listing): BestSeller & PriceFields & { href: string } {
  const inStock = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
  return {
    name: p.name,
    shortName: p.name.replace(/^The\s+/i, ""),
    badge: p.badge || "Best Seller",
    ...priceFields(p),
    detail: `${p.material} • ${p.spec}`,
    image: p.image,
    alt: p.alt,
    defaultSize: inStock.includes(38) ? 38 : (inStock[0] ?? 38),
    soldOut: p.soldOutSizes,
    href: productHref(p),
  };
}

export function toSearchEntry(p: Listing): SearchEntry & PriceFields {
  return {
    id: p.slug,
    name: p.name,
    detail: `${p.spec} · ${p.material}`,
    ...priceFields(p),
    image: p.image,
    alt: p.alt,
    href: productHref(p),
  };
}
