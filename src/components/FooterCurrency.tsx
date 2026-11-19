"use client";

import { currencies, type Currency } from "@/lib/currency";
import { setCurrency, useCurrency } from "@/lib/store";

const labels: Record<Currency, string> = { PKR: "PKR (Rs)", USD: "USD ($) ≈", EUR: "EUR (€) ≈" };

/** Display-currency picker in the footer (shares state with the header switch). */
export default function FooterCurrency() {
  const current = useCurrency();
  return (
    <label className="flex items-center gap-space-xs tracking-wider text-[#cfc2b4]">
      <span className="text-secondary-fixed font-medium">CURRENCY:</span>
      <select
        className="bg-transparent text-[#f3ece4] [&>option]:text-primary font-label-uppercase text-label-uppercase uppercase cursor-pointer border-none focus:outline-none"
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
