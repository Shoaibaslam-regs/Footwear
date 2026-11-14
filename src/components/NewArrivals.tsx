import Image from "next/image";
import Link from "next/link";
import { toArrivalCard } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import WishlistButton from "./WishlistButton";
import QuickAddButton from "./QuickAddButton";
import { productId } from "@/lib/product-id";
import SalePrice from "@/components/SalePrice";
import { accent, eyebrow, quietPrice, sectionTitle } from "@/lib/home-type";

/** The second photo wipes in from the right on hover (mouse devices only). */
const swap =
  "object-cover [clip-path:inset(0_0_0_100%)] group-hover:[clip-path:inset(0)] transition-[clip-path] duration-700 ease-[var(--ease-lux)] motion-reduce:transition-none";

export default async function NewArrivals() {
  const all = await getPublishedProducts();
  const flagged = all.filter((p) => p.newArrival);
  const newArrivals = (flagged.length ? flagged : all).slice(0, 4).map(toArrivalCard);
  return (
    <section className="w-full bg-surface-container-low py-space-xl lg:py-28" id="new-arrivals">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="flex items-end justify-between gap-space-md mb-space-lg lg:mb-space-xl">
          <div data-reveal>
            <span className={eyebrow}>Just In</span>
            <h2 className={`${sectionTitle} mt-2`}>
              New <em className={accent}>Arrivals</em>
            </h2>
          </div>
          <Link
            className="link-draw shrink-0 pb-1 font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-primary"
            href="/collections?sort=newest"
          >
            View all
          </Link>
        </div>

        {/* Quiet cards: the photo does the talking. No boxes, no badges, no red chips. */}
        <div data-reveal-stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-space-sm gap-y-space-lg sm:gap-x-gutter">
          {newArrivals.map((p) => (
            <article key={p.name} className="group flex flex-col">
              <div className="relative w-full aspect-[3/4] overflow-hidden rounded-lg bg-surface-container mb-space-sm sm:mb-space-md">
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
                  className="img-scale w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  alt={p.alt}
                  src={p.image}
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                />
                {p.hoverImage && <Image alt="" aria-hidden="true" className={swap} fill sizes="(min-width: 1024px) 25vw, 50vw" src={p.hoverImage} />}
                <div className="absolute inset-x-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden sm:flex gap-1">
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
              <div className="flex flex-col gap-1 px-0.5">
                <span className="font-label-uppercase text-[9px] sm:text-[10px] text-outline tracking-[0.22em] uppercase truncate">{p.spec}</span>
                <h3 className="font-headline-sm text-[16px] sm:text-[20px] leading-snug text-primary tracking-[-0.01em] font-normal">
                  {p.href ? (
                    <Link className="link-draw" href={p.href}>
                      {p.name}
                    </Link>
                  ) : (
                    p.name
                  )}
                </h3>
                <span className={quietPrice}>
                  <SalePrice quiet price={p.price} compareAt={p.compareAt} discountPercent={p.discountPercent} />
                </span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
