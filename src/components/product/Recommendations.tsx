import Image from "next/image";
import Link from "next/link";
import CardLabel from "@/components/CardLabel";
import SalePrice, { PercentOff } from "@/components/SalePrice";
import WishlistButton from "@/components/WishlistButton";
import { cardLabel, productHref, salePrice, type Listing } from "@/lib/products";

/** "Complete the Look": the shop's quiet cards (one label, gold sale price, percent at the right). */
export default function Recommendations({ items }: { items: Listing[] }) {
  if (items.length === 0) return null;
  return (
    <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin py-space-xl">
      <div className="mb-space-lg">
        <span className="block font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-secondary">You May Also Like</span>
        <h2 className="mt-2 font-headline-lg text-[28px] sm:text-[36px] leading-[1.1] tracking-[-0.02em] text-primary font-normal">
          Complete <em className="italic text-secondary">the Look</em>
        </h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-space-lg sm:gap-x-gutter">
        {items.map((r) => (
          <article key={r.id} className="group relative flex flex-col">
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-container">
              <Image
                alt={r.alt}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                fill
                sizes="(min-width: 1024px) 22vw, 50vw"
                src={r.image}
              />
              <CardLabel label={cardLabel(r)} />
              <WishlistButton
                item={{ id: r.slug, name: r.name, price: salePrice(r), image: r.image, alt: r.alt, href: productHref(r), detail: r.material }}
                variant="catalog"
              />
            </div>
            <div className="pt-2.5 sm:pt-space-sm flex flex-col gap-0.5 px-0.5">
              <span className="font-label-uppercase text-[9px] sm:text-[10px] text-outline uppercase tracking-[0.18em] truncate">{r.spec}</span>
              <h3 className="font-headline-sm text-[15px] sm:text-[18px] leading-snug text-primary tracking-[-0.01em] font-normal line-clamp-2">
                <Link className="after:absolute after:inset-0" href={productHref(r)}>
                  {r.name}
                </Link>
              </h3>
              <div className="flex items-start justify-between gap-2">
                <span className="font-body-md text-[13px] sm:text-[15px] text-primary tracking-wide tabular-nums min-w-0">
                  <SalePrice
                    category={r.category}
                    compareAt={r.discountPercent ? r.price : undefined}
                    discountPercent={r.discountPercent || undefined}
                    price={salePrice(r)}
                    quiet
                    slug={r.slug}
                  />
                </span>
                <PercentOff className="mt-0.5" percent={r.discountPercent || undefined} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
