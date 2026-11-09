"use client";

import { Fragment } from "react";
import { currencies } from "@/lib/currency";
import { setCurrency, useCurrency } from "@/lib/store";

export default function CurrencySwitch({ className = "" }: { className?: string }) {
  const current = useCurrency();
  return (
    <div
      aria-label="Display currency"
      className={`flex items-center gap-space-xs font-label-uppercase text-label-uppercase text-on-surface-variant ${className}`}
      role="group"
    >
      {currencies.map((c, i) => (
        <Fragment key={c}>
          {i > 0 && <span className="text-outline-variant">/</span>}
          <button
            aria-pressed={c === current}
            className={`uppercase transition-colors hover:text-on-surface ${
              c === current ? "text-on-surface" : "text-outline"
            }`}
            onClick={() => setCurrency(c)}
            type="button"
          >
            {c}
          </button>
        </Fragment>
      ))}
    </div>
  );
}
