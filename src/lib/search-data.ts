export type SearchEntry = {
  id: string;
  name: string;
  detail: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  /** Listing category, so a live sale event can price it (see SalePrice). */
  category?: string;
  image: string;
  alt: string;
  href: string;
};

export const trendingSearches = ["Stiletto", "Mule", "Sandal", "Satin", "Bridal"];

export function searchProducts(index: SearchEntry[], query: string): SearchEntry[] {
  const terms = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return index.filter((e) => {
    const text = `${e.name} ${e.detail}`.toLowerCase();
    return terms.every((t) => text.includes(t));
  });
}
