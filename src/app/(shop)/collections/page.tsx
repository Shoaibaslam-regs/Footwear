import type { Metadata } from "next";
import CollectionIntro from "@/components/collection/CollectionIntro";
import Catalog from "@/components/collection/Catalog";
import Assurances from "@/components/collection/Assurances";
import { productCategories, toCatalogCard, type ProductCategory } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import { getRatingsBySlug } from "@/lib/server/reviews";
import { getOnlineSales } from "@/lib/server/sales";

export const metadata: Metadata = {
  title: "Shop All Shoes — ÉLORA Maison",
  description:
    "Shop handmade Italian shoes for women: heels, sandals, flats and bridal shoes. Cash on Delivery across Pakistan.",
};

export default async function CollectionsPage() {
  const [listings, sales, ratings] = await Promise.all([getPublishedProducts(), getOnlineSales(), getRatingsBySlug()]);
  const products = listings.map((p) => toCatalogCard(p, { sold: sales[p.slug], rating: ratings[p.slug] }));
  const counts = Object.fromEntries(
    productCategories.map((c) => [c.value, products.filter((p) => p.category === c.value).length]),
  ) as Record<ProductCategory, number>;
  return (
    <div className="flex flex-col w-full">
      <CollectionIntro counts={counts} total={products.length} />
      <Catalog products={products} />
      <Assurances />
    </div>
  );
}
