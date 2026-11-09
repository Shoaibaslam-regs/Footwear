import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedProduct, getPublishedProducts } from "@/lib/server/products";
import { toProductDetail } from "@/lib/product-detail";
import { soldCount } from "@/lib/products";
import { getProductReviews } from "@/lib/server/reviews";
import { getOnlineSales } from "@/lib/server/sales";
import ProductGallery from "@/components/product/ProductGallery";
import PurchasePanel from "@/components/product/PurchasePanel";
import CraftSection from "@/components/product/CraftSection";
import ProductReviews from "@/components/product/ProductReviews";
import Recommendations from "@/components/product/Recommendations";
import RecentlyViewed from "@/components/product/RecentlyViewed";
import { toSearchEntry } from "@/lib/products";

export async function generateStaticParams() {
  const all = await getPublishedProducts();
  return all.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getPublishedProduct(slug);
  if (!listing) return {};
  return {
    title: `${listing.name} — ÉLORA Maison`,
    description: listing.description || `${listing.name}, handcrafted in Florence. ${listing.material}.`,
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const listing = await getPublishedProduct(slug);
  if (!listing) notFound();
  const [{ summary, reviews }, sales] = await Promise.all([getProductReviews(slug), getOnlineSales()]);
  const product = {
    ...toProductDetail(listing),
    rating: summary.average,
    reviewCount: summary.count,
    sold: soldCount(listing, sales[slug]),
  };
  const others = (await getPublishedProducts()).filter((p) => p.slug !== slug);
  const pairings = [
    ...others.filter((p) => p.category === listing.category),
    ...others.filter((p) => p.category !== listing.category),
  ].slice(0, 4);

  return (
    <div className="flex flex-col w-full">
      {/* Breadcrumb & Series Header */}
      <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin pt-space-xs pb-space-sm">
        <div className="flex items-center justify-between font-label-uppercase text-label-uppercase text-on-surface-variant">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-space-xs tracking-widest text-[10px] uppercase"
          >
            <Link className="hover:text-on-surface transition-colors" href="/collections">
              Collections
            </Link>
            <span>/</span>
            <Link className="hover:text-on-surface transition-colors" href="/collections">
              {product.breadcrumbCategory}
            </Link>
            <span>/</span>
            <span className="text-primary font-medium">
              {product.breadcrumbName}
            </span>
          </nav>
          <div className="hidden md:flex items-center gap-space-sm text-[10px] tracking-widest uppercase">
            <span className="text-secondary font-medium">{product.edition}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span>{product.workshop}</span>
          </div>
        </div>
      </section>

      {/* Main Product Stage */}
      <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-start">
          <ProductGallery product={product} />
          <PurchasePanel product={product} />
        </div>
      </section>

      <CraftSection />
      <ProductReviews reviews={reviews} sizes={listing.sizes} slug={slug} summary={summary} />
      <Recommendations items={pairings} />
      <RecentlyViewed catalogue={others.map(toSearchEntry)} current={slug} />
    </div>
  );
}
