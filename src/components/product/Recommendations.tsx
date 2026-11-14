import Image from "next/image";
import Link from "next/link";
import SalePrice, { DiscountBadge } from "@/components/SalePrice";
import WishlistButton from "@/components/WishlistButton";
import { productHref, salePrice, type Listing } from "@/lib/products";

export default function Recommendations({ items }: { items: Listing[] }) {
  if (items.length === 0) return null;
  return (
    <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <div className="space-y-space-lg">
        <div className="flex items-end justify-between">
          <div>
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              You May Also Like
            </span>
            <h2 className="font-headline-sm text-[26px] leading-tight lg:font-headline-lg-mobile lg:text-headline-lg-mobile text-primary font-normal">
              Complete the Look
            </h2>
          </div>
          <div className="hidden sm:flex items-center gap-space-xs">
            <button
              aria-label="Previous suggestions"
              className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_left
              </span>
            </button>
            <button
              aria-label="Next suggestions"
              className="w-10 h-10 rounded-full bg-surface-container-low hover:bg-surface-container-high text-on-surface flex items-center justify-center transition-colors"
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">
                chevron_right
              </span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-gutter">
          {items.map((r) => (
            <div key={r.id} className="group relative flex flex-col bg-surface-container-lowest">
              <div className="relative aspect-[3/4] overflow-hidden bg-surface-container-low">
                <Image
                  alt={r.alt}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  src={r.image}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                {r.badge && (
                  <span
                    className={`absolute top-3 left-3 px-2 py-0.5 bg-primary text-on-primary font-label-uppercase text-[9px] uppercase tracking-wider`}
                  >
                    {r.badge}
                  </span>
                )}
                <DiscountBadge className="bottom-3 left-3" percent={r.discountPercent || undefined} />
                <WishlistButton
                  item={{
                    id: r.slug,
                    name: r.name,
                    price: salePrice(r),
                    image: r.image,
                    alt: r.alt,
                    href: productHref(r),
                    detail: r.material,
                  }}
                />
              </div>
              <div className="p-space-sm sm:p-space-md space-y-1 min-w-0">
                <span className="font-label-uppercase text-label-uppercase text-on-surface-variant text-[10px] uppercase">
                  {r.spec}
                </span>
                <h4 className="font-headline-sm text-headline-sm text-primary font-normal group-hover:text-secondary transition-colors line-clamp-2">
                  <Link href={productHref(r)}>{r.name}</Link>
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface font-medium">
                  <SalePrice
                    price={salePrice(r)}
                    compareAt={r.discountPercent ? r.price : undefined}
                    discountPercent={r.discountPercent || undefined}
                  />
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
