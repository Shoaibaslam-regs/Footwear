import Image from "next/image";
import Link from "next/link";
import type { FilterableProduct } from "@/lib/catalog-filters";
import Stars from "@/components/product/Stars";
import WishlistButton from "../WishlistButton";
import { productId } from "@/lib/product-id";
import SalePrice, { PercentOff, SaleTag } from "@/components/SalePrice";
import CardLabel from "@/components/CardLabel";

/**
 * A shop card, kept calm for phones (most customers): the photo, one small
 * label (`cardLabel`: the admin badge, else Best Seller / New), a quiet heart, the heel height, the name and the price
 * (a sale price in gold with the old one struck through; never red). No badge
 * piles, "N sold", hover toolbars or 360° promises.
 * Tapping anywhere on the card opens the product page (the name is a link
 * stretched over the card). On desktop a small "Quick view" button appears on
 * hover; phones have no Quick View, just the product page. On a mouse, the
 * second photo wipes in on hover.
 */
export default function CatalogProductCard({
  product: p,
  onQuickView,
}: {
  product: FilterableProduct;
  onQuickView: (size?: number) => void;
}) {
  const second = p.gallery?.[1]?.url;

  return (
    <article className="group relative flex flex-col">
      <div className="relative w-full aspect-[3/4] bg-surface-container overflow-hidden rounded-lg">
        <Image
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          alt={p.alt}
          src={p.image}
          fill
          sizes="(min-width: 1024px) 22vw, 50vw"
        />
        {second && (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover [clip-path:inset(0_0_0_100%)] group-hover:[clip-path:inset(0)] transition-[clip-path] duration-700 ease-[var(--ease-lux)] motion-reduce:transition-none"
            fill
            sizes="(min-width: 1024px) 22vw, 50vw"
            src={second}
          />
        )}
        <CardLabel label={p.badge} />
        {/* Desktop only: a quiet Quick View on hover (above the card link). */}
        <button
          aria-haspopup="dialog"
          aria-label={`Quick view ${p.name}`}
          className="hidden lg:flex absolute z-20 left-2 right-2 bottom-2 h-9 items-center justify-center gap-1.5 bg-surface/90 backdrop-blur-sm text-primary font-label-uppercase text-[10px] uppercase tracking-[0.18em] opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 focus-visible:opacity-100 focus-visible:translate-y-0 hover:bg-primary hover:text-on-primary transition-all duration-300"
          onClick={() => onQuickView()}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[15px]">
            zoom_in
          </span>
          Quick view
        </button>
        <WishlistButton
          variant="catalog"
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
      </div>

      <div className="pt-2.5 sm:pt-space-sm flex flex-col gap-0.5 px-0.5">
        <span className="font-label-uppercase text-[9px] sm:text-[10px] text-outline uppercase tracking-[0.18em] truncate">{p.spec}</span>
        <h3 className="font-headline-sm text-[15px] sm:text-[18px] leading-snug text-primary tracking-[-0.01em] font-normal line-clamp-2">
          {/* Stretched over the whole card: a tap anywhere opens the product page. */}
          <Link className="after:absolute after:inset-0 after:z-[5]" href={p.href ?? "/collections"}>
            {p.name}
          </Link>
        </h3>
        {/* Price on the left, the percent off at the right end of the line. */}
        <div className="flex items-start justify-between gap-2">
          <span className="font-body-md text-[13px] sm:text-[15px] text-primary tracking-wide tabular-nums min-w-0">
            <SalePrice compareAt={p.compareAt} discountPercent={p.discountPercent} price={p.price} quiet saleTag={p.saleTag} tagClassName="hidden sm:inline-block" />
          </span>
          {/* Right end: on phones the sale tag (e.g. 12.12) sits above the percent off. */}
          <span className="shrink-0 flex flex-col items-end gap-1 mt-0.5">
            <SaleTag className="sm:hidden" tag={p.saleTag} />
            <PercentOff percent={p.discountPercent} />
          </span>
        </div>
        {p.rating && p.rating.count > 0 && (
          <span className="hidden sm:flex items-center gap-1 text-[11px] text-on-surface-variant">
            <Stars size="text-[12px]" value={p.rating.average} />({p.rating.count})
          </span>
        )}
      </div>
    </article>
  );
}
