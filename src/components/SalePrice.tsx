import Price from "./Price";

/**
 * Price with an optional struck-through original and "-47%" chip.
 * `price` is what the customer pays; `compareAt` is the pre-discount price.
 */
export default function SalePrice({
  price,
  compareAt,
  discountPercent,
  className = "",
  chipOnPhones = false,
}: {
  price: number;
  compareAt?: number;
  discountPercent?: number;
  className?: string;
  /** Cards already show the percent on the photo, so phones skip the chip unless asked. */
  chipOnPhones?: boolean;
}) {
  if (!compareAt || compareAt <= price) return <Price amount={price} />;
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
        <span className={`${chipOnPhones ? "" : "hidden sm:inline "}font-label-uppercase text-[10px] uppercase tracking-wider text-on-error bg-error rounded-full px-1.5 py-0.5 self-center`}>
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
      className={`absolute z-10 px-2.5 py-1 bg-error text-on-error font-label-uppercase text-[10px] tracking-widest uppercase rounded-full shadow-sm ${className}`}
    >
      −{percent}% Off
    </span>
  );
}
