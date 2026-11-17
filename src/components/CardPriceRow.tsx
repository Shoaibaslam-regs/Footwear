"use client";

import SalePrice, { PercentOff, SaleTag } from "@/components/SalePrice";
import { useCardPrice, type CardPrice } from "@/components/sale/SaleProvider";

type Resolved = { price: number; compareAt?: number; discountPercent?: number; saleTag?: string };

/**
 * The shop card's price line: the price on the left (a sale price in gold with
 * the old one struck through).
 * - Phones: at the right end, a sale's tag (e.g. 12.12) above the percent off.
 * - Larger screens (owner, 2026-11-18): the percent off under the price, the
 *   sale's tag at the right end.
 * Takes prices already re-priced for any live sale.
 */
export function CardPriceRow({
  price,
  compareAt,
  discountPercent,
  saleTag,
  priceClassName = "font-body-md text-[13px] sm:text-[15px] text-primary tracking-wide tabular-nums",
}: Resolved & { priceClassName?: string }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className={`${priceClassName} min-w-0`}>
        <SalePrice compareAt={compareAt} discountPercent={discountPercent} price={price} quiet />
        {discountPercent ? (
          <span className="hidden sm:block mt-1">
            <PercentOff percent={discountPercent} />
          </span>
        ) : null}
      </span>
      <span className="shrink-0 flex flex-col items-end gap-1 mt-0.5">
        <SaleTag tag={saleTag} />
        <PercentOff className="sm:hidden" percent={discountPercent} />
      </span>
    </div>
  );
}

/** The same line for a listing's own prices: applies a live sale (percent and tag) first, like the shop. */
export function LiveCardPriceRow(card: CardPrice) {
  const live = useCardPrice(card);
  return (
    <CardPriceRow
      compareAt={live.compareAt}
      discountPercent={live.discountPercent || undefined}
      price={live.price}
      saleTag={live.sale?.tag}
    />
  );
}
