"use client";

import Price from "./Price";
import MiniPlaque from "./MiniPlaque";
import { useCardPrice } from "./sale/SaleProvider";

/** The small tag next to a sale price, e.g. "11.11": always the mini sale plaque (components/MiniPlaque.tsx). */
export function SaleTag({ tag, className = "" }: { tag?: string; className?: string }) {
  if (!tag) return null;
  return (
    <MiniPlaque className={`self-center ${className}`} tone="dark">
      {tag}
    </MiniPlaque>
  );
}

/**
 * The percent chip anywhere outside the card price line: the champagne mini
 * plaque while a sale sets the price (`sale`), else the plain chip.
 */
export function OffChip({ percent, sale, className = "" }: { percent?: number; sale: boolean; className?: string }) {
  if (!percent) return null;
  return sale ? (
    <MiniPlaque className={className} tone="champagne">
      −{percent}%
    </MiniPlaque>
  ) : (
    <PercentOff className={className} percent={percent} />
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
  tagClassName = "",
  ...rest
}: Parameters<typeof PriceView>[0] & {
  slug?: string;
  category?: string;
  saleTag?: string;
  /** Classes for the inline sale tag, e.g. "hidden sm:inline-block" when a card shows it elsewhere on phones. */
  tagClassName?: string;
}) {
  const live = useCardPrice({ slug, category, price: rest.price, compareAt: rest.compareAt, discountPercent: rest.discountPercent });
  const tag = saleTag ?? live.sale?.tag;
  const view = <PriceView {...rest} compareAt={live.compareAt} discountPercent={live.discountPercent || undefined} onSale={!!tag} price={live.price} />;
  if (!tag) return view;
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-1">
      {view}
      <SaleTag className={tagClassName} tag={tag} />
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
  onSale = false,
}: {
  price: number;
  compareAt?: number;
  discountPercent?: number;
  className?: string;
  /** Cards already show the percent on the photo, so phones skip the chip unless asked. */
  chipOnPhones?: boolean;
  /** Home cards: the sale price in gold, the old price struck through, no red chip. */
  quiet?: boolean;
  /** A live sale sets this price: the percent chip is the mini sale plaque. */
  onSale?: boolean;
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
      {discountPercent ? <OffChip className={`${chipOnPhones ? "" : "hidden sm:inline-flex "}self-center`} percent={discountPercent} sale={onSale} /> : null}
    </span>
  );
}

/** "−56%" for the right end of a card's price line (calm champagne, never red). */
export function PercentOff({ percent, className = "" }: { percent?: number; className?: string }) {
  if (!percent) return null;
  return (
    <span className={`shrink-0 self-start px-1.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed font-label-uppercase text-[10px] leading-none tracking-wider tabular-nums ${className}`}>
      −{percent}%
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
