import { products as richDetails, type ProductDetail } from "./product-data";
import { categoryLabel, LOW_STOCK, salePrice, stockLeft, type Listing } from "./products";

/**
 * Builds the product page model from an admin listing.
 * Listings with a hand-written editorial page (lib/product-data.ts) keep
 * their gallery and copy; the admin-managed fields always win.
 */
export function toProductDetail(p: Listing): ProductDetail {
  const rich = richDetails[p.slug];
  const gallery = p.gallery.map((g, i) => ({
    label: `${String(i + 1).padStart(2, "0")}${g.caption ? ` ${g.caption}` : ""}`,
    ariaLabel: `View photo ${i + 1}${g.caption ? `: ${g.caption}` : ""}`,
    image: g.url,
    thumb: g.url,
    alt: g.alt,
  }));
  const pricing =
    p.discountPercent > 0
      ? { price: salePrice(p), compareAt: p.price, discountPercent: p.discountPercent }
      : { price: p.price, compareAt: undefined, discountPercent: undefined };
  const sizes = p.sizes.map((s) => {
    const left = stockLeft(p, s);
    const soldOut = p.soldOutSizes.includes(s) || left === 0;
    return {
      size: String(s),
      ...(soldOut ? { soldOut: true } : {}),
      ...(!soldOut && left !== null && left <= LOW_STOCK ? { lowStock: true, left } : {}),
    };
  });
  const available = p.sizes.filter((s) => !p.soldOutSizes.includes(s));
  const defaultSize = String(available.includes(38) ? 38 : (available[0] ?? p.sizes[0] ?? 38));

  if (rich) {
    return {
      ...rich,
      name: p.name,
      ...pricing,
      gallery,
      breadcrumbCategory: categoryLabel(p.category),
      sizes,
      defaultSize,
    };
  }

  const base = richDetails["aurelia-stiletto"];
  return {
    slug: p.slug,
    name: p.name,
    breadcrumbCategory: categoryLabel(p.category),
    breadcrumbName: p.name.replace(/^The\s+/i, ""),
    edition: "Atelier Edition",
    workshop: "Florentine Workshop",
    eyebrow: `${categoryLabel(p.category)} • Italian Handcrafted`,
    rating: 4.8,
    reviewCount: 0,
    ...pricing,
    badges: p.badge
      ? [{ label: p.badge, className: "bg-surface/90 backdrop-blur-md text-on-surface" }]
      : [],
    gallery,
    quote: p.description || "“Crafted to elevate without compromise.”",
    certificate: "Certificato d'Origine",
    colors: [{ name: p.material, hex: "#211B19" }],
    defaultColor: p.material,
    sizes,
    defaultSize,
    fitInsight:
      p.description ||
      "True to Italian luxury sizing. If you have wider feet, the maison advises taking a half size larger.",
    guarantees: base.guarantees,
    specs: [
      { label: "Silhouette", value: p.spec || categoryLabel(p.category) },
      { label: "Upper Material", value: p.material },
      { label: "Origin", value: "Handmade in Florence, Italy" },
    ],
    care: base.care,
    shipping: base.shipping,
  };
}
