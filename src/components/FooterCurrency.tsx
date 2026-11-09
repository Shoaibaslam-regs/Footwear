"use client";

import { currencies, type Currency } from "@/lib/currency";
import { setCurrency, useCurrency } from "@/lib/store";

const labels: Record<Currency, string> = { PKR: "PKR (Rs)", USD: "USD ($) ≈", EUR: "EUR (€) ≈" };

/** Display-currency picker in the footer (shares state with the header switch). */
export default function FooterCurrency() {
  const current = useCurrency();
  return (
    <label className="flex items-center gap-space-xs tracking-wider text-on-surface-variant">
      <span className="text-primary font-medium">CURRENCY:</span>
      <select
        className="bg-transparent text-on-surface font-label-uppercase text-label-uppercase uppercase cursor-pointer border-none focus:outline-none"
        onChange={(e) => setCurrency(e.target.value as Currency)}
        value={current}
      >
        {currencies.map((c) => (
          <option key={c} value={c}>
            {labels[c]}
          </option>
        ))}
      </select>
    </label>
  );
}
