"use client";

import { formatPrice } from "@/lib/currency";
import { useCurrency } from "@/lib/store";

/**
 * Renders a PKR amount in the visitor's display currency. Other currencies are
 * indicative conversions, so they are marked "≈"; orders are always charged in PKR.
 */
export default function Price({ amount }: { amount: number }) {
  const currency = useCurrency();
  const text = formatPrice(amount, currency);
  if (currency === "PKR") return <>{text}</>;
  return (
    <span title={`Approximately. You are charged ${formatPrice(amount, "PKR")}.`}>
      <span aria-label="approximately">≈ </span>
      {text}
    </span>
  );
}

/** Hook form, for prices inside strings (labels, aria text). */
export function useFormatPrice() {
  const currency = useCurrency();
  return (amount: number) => (currency === "PKR" ? "" : "≈ ") + formatPrice(amount, currency);
}
