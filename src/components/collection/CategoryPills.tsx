"use client";

import { updateFilters, useFilters } from "@/lib/catalog-filters";
import { productCategories, type ProductCategory } from "@/lib/products";

/** Calm square chips; the count sits quietly after the name. */
const base =
  "shrink-0 h-9 px-3.5 sm:px-4 inline-flex items-center gap-1.5 font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.14em] transition-colors whitespace-nowrap";

/** Quick single-category switch; shares state with the sidebar filters. */
export default function CategoryPills({ counts, total }: { counts: Record<ProductCategory, number>; total: number }) {
  const { categories } = useFilters();
  const pills = [
    { value: null, label: "All", n: total },
    ...productCategories.map((c) => ({ value: c.value, label: c.label, n: counts[c.value] ?? 0 })),
  ];

  return (
    <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] -mx-margin-mobile px-margin-mobile lg:mx-0 lg:px-0">
      {pills.map((p) => {
        const active = p.value === null ? categories.length === 0 : categories.length === 1 && categories[0] === p.value;
        return (
          <button
            key={p.label}
            aria-pressed={active}
            className={`${base} ${
              active ? "bg-primary text-on-primary" : "ring-1 ring-inset ring-outline-variant/70 text-on-surface-variant hover:ring-primary hover:text-primary"
            }`}
            onClick={() => updateFilters({ categories: p.value ? [p.value] : [] })}
            type="button"
          >
            {p.label}
            <span className={active ? "text-on-primary/60" : "text-outline"}>{p.n}</span>
          </button>
        );
      })}
    </div>
  );
}
