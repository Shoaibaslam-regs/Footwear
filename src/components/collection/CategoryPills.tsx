"use client";

import { updateFilters, useFilters } from "@/lib/catalog-filters";
import { productCategories, type ProductCategory } from "@/lib/products";

const base =
  "px-space-lg py-space-sm font-label-uppercase text-label-uppercase uppercase tracking-wider rounded-full transition-all whitespace-nowrap";

/** Quick single-category switch; shares state with the sidebar filters. */
export default function CategoryPills({ counts, total }: { counts: Record<ProductCategory, number>; total: number }) {
  const { categories } = useFilters();
  const pills = [
    { value: null, label: "All", n: total },
    ...productCategories.map((c) => ({ value: c.value, label: c.label, n: counts[c.value] ?? 0 })),
  ];

  return (
    <div className="flex items-center gap-space-xs overflow-x-auto pb-space-xs no-scrollbar pt-space-xs">
      {pills.map((p) => {
        const active = p.value === null ? categories.length === 0 : categories.length === 1 && categories[0] === p.value;
        return (
          <button
            key={p.label}
            aria-pressed={active}
            className={`${base} ${
              active
                ? "bg-primary text-on-primary shadow-sm"
                : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => updateFilters({ categories: p.value ? [p.value] : [] })}
            type="button"
          >
            {p.label} ({p.n})
          </button>
        );
      })}
    </div>
  );
}
