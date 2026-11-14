"use client";

import Price from "./Price";
import { useCardPrice } from "./sale/SaleProvider";

/** The small tag next to a sale price, e.g. "11.11". */
export function SaleTag({ tag, className = "" }: { tag?: string; className?: string }) {
  if (!tag) return null;
  return (
    <span className={`inline-block self-center bg-primary text-secondary-fixed font-label-uppercase text-[9px] leading-none tracking-[0.18em] uppercase px-1.5 py-1 ${className}`}>
      {tag}
    </span>
  );
}

/**
 * Price with an optional struck-through original and "-47%" chip.
 * `price` is what the customer pays; `compareAt` is the pre-discount price.
 * Given the listing's `slug` (and `category`), it applies a live sale event
 * (components/sale/SaleProvider.tsx) and shows the sale's tag. Lists that are
 * already re-priced (the catalogue) pass `saleTag` instead.
 */
export default function SalePrice({
  slug,
  category,
  saleTag,
  ...rest
}: Parameters<typeof PriceView>[0] & { slug?: string; category?: string; saleTag?: string }) {
  const live = useCardPrice({ slug, category, price: rest.price, compareAt: rest.compareAt, discountPercent: rest.discountPercent });
  const tag = saleTag ?? live.sale?.tag;
  const view = <PriceView {...rest} compareAt={live.compareAt} discountPercent={live.discountPercent || undefined} price={live.price} />;
  if (!tag) return view;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {view}
      <SaleTag tag={tag} />
    </span>
  );
}

function PriceView({
  price,
  compareAt,
  discountPercent,
  className = "",
  chipOnPhones = false,
  quiet = false,
}: {
  price: number;
  compareAt?: number;
  discountPercent?: number;
  className?: string;
  /** Cards already show the percent on the photo, so phones skip the chip unless asked. */
  chipOnPhones?: boolean;
  /** Home cards: the sale price in gold, the old price struck through, no red chip. */
  quiet?: boolean;
}) {
  if (!compareAt || compareAt <= price) return <Price amount={price} />;
  if (quiet)
    return (
      <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
        <span className="text-secondary">
          <Price amount={price} />
        </span>
        <s className="text-outline text-[0.85em]">
          <span className="sr-only">was </span>
          <Price amount={compareAt} />
        </s>
      </span>
    );
  return (
    <span className={`inline-flex flex-wrap items-baseline gap-x-1.5 ${className}`}>
      <span className="text-error">
        <Price amount={price} />
      </span>
      <s className="text-outline font-normal text-[0.85em]">
        <span className="sr-only">was </span>
        <Price amount={compareAt} />
      </s>
      {discountPercent ? (
        <span className={`${chipOnPhones ? "" : "hidden sm:inline "}font-label-uppercase text-[10px] uppercase tracking-wider bg-secondary-fixed text-on-secondary-fixed rounded-full px-1.5 py-0.5 self-center`}>
          −{discountPercent}%
        </span>
      ) : null}
    </span>
  );
}

/** Corner chip for product images. */
export function DiscountBadge({ percent, className = "" }: { percent?: number; className?: string }) {
  if (!percent) return null;
  return (
    <span
      className={`absolute z-10 px-2.5 py-1 bg-secondary-fixed text-on-secondary-fixed font-label-uppercase text-[10px] tracking-widest uppercase rounded-full shadow-sm ${className}`}
    >
      −{percent}% Off
    </span>
  );
}
