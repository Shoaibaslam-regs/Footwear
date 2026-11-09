import Image from "next/image";
import Link from "next/link";
import { toArrivalCard } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import WishlistButton from "./WishlistButton";
import QuickAddButton from "./QuickAddButton";
import { productId } from "@/lib/product-id";
import SalePrice, { DiscountBadge } from "@/components/SalePrice";

export default async function NewArrivals() {
  const all = await getPublishedProducts();
  const flagged = all.filter((p) => p.newArrival);
  const newArrivals = (flagged.length ? flagged : all).slice(0, 4).map(toArrivalCard);
  return (
    <section
      className="w-full bg-surface-container-low py-space-xl"
      id="new-arrivals"
    >
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md mb-space-lg">
          <div data-reveal>
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              Just In
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight mt-1">
              New Arrivals
            </h2>
          </div>
          <div className="flex items-center gap-space-md">
            <span className="font-label-uppercase text-label-uppercase text-on-surface-variant uppercase tracking-widest">
              {newArrivals.length} of {all.length} Styles
            </span>
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous"
                className="w-10 h-10 rounded-full bg-surface hover:bg-primary hover:text-on-primary text-primary transition-all flex items-center justify-center shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_left
                </span>
              </button>
              <button
                aria-label="Next"
                className="w-10 h-10 rounded-full bg-surface hover:bg-primary hover:text-on-primary text-primary transition-all flex items-center justify-center shadow-sm"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">
                  chevron_right
                </span>
              </button>
            </div>
          </div>
        </div>

        <div data-reveal-stagger className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-gutter">
          {newArrivals.map((p) => (
            <article
              key={p.name}
              className="group bg-surface-container-lowest rounded-lg p-1.5 sm:p-space-sm shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded bg-surface-container-low mb-space-sm sm:mb-space-md">
                <span
                  className={`absolute top-2 left-2 sm:top-3 sm:left-3 z-10 max-w-[calc(100%-3.5rem)] truncate px-2 sm:px-2.5 py-0.5 sm:py-1 ${p.badgeClass} font-label-uppercase text-[9px] sm:text-[10px] tracking-widest uppercase rounded-full`}
                >
                  {p.badge}
                </span>
                <DiscountBadge className="top-9 left-2 sm:top-12 sm:left-3 px-2! text-[9px]! sm:px-2.5! sm:text-[10px]!" percent={p.discountPercent} />
                <WishlistButton
                  item={{
                    id: productId(p.name, p.href),
                    name: p.name,
                    price: p.price,
                    image: p.image,
                    alt: p.alt,
                    href: p.href,
                    detail: p.material,
                  }}
                />
                <Image
                  className="img-fade w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={p.alt}
                  src={p.image}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                <div className="absolute inset-x-3 bottom-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex gap-1">
                  <QuickAddButton
                    product={{
                      id: productId(p.name, p.href),
                      name: p.shortName,
                      price: p.price,
                      image: p.image,
                      alt: p.alt,
                      href: p.href,
                      material: p.material,
                    }}
                  />
                </div>
              </div>
              <div className="flex flex-col px-space-xs pb-space-xs gap-1">
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-0.5">
                  <span className="font-label-uppercase text-[10px] sm:text-[11px] text-secondary tracking-widest uppercase truncate">
                    {p.spec}
                  </span>
                  <span className="font-label-md text-label-sm sm:text-label-md font-semibold text-primary">
                    <SalePrice price={p.price} compareAt={p.compareAt} discountPercent={p.discountPercent} />
                  </span>
                </div>
                <h3 className="font-headline-sm text-body-lg sm:text-headline-sm leading-snug text-primary tracking-normal group-hover:text-secondary transition-colors">
                  {p.href ? (
                    <Link className="link-draw" href={p.href}>
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </h3>
                <p className="font-body-sm text-xs sm:text-body-sm text-on-surface-variant line-clamp-1 sm:line-clamp-none">
                  {p.material}
                </p>
                <div className="hidden sm:flex items-center gap-2 pt-2">
                  {p.swatches.map((s) => (
                    <span
                      key={s.title}
                      className="w-3.5 h-3.5 rounded-full shadow-inner"
                      style={{ backgroundColor: s.color }}
                      title={s.title}
                    />
                  ))}
                  <span className="font-label-sm text-[11px] text-outline ml-1">
                    {p.moreColors}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
