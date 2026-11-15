"use client";

import SelectMenu from "@/components/SelectMenu";
import { sortOptions, type SortOption } from "@/lib/catalog-filters";

/** The shop's sort control: the shared themed dropdown (components/SelectMenu.tsx). */
export default function SortMenu({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <SelectMenu
      buttonClassName={(open) =>
        `h-9 flex items-center gap-1 pl-3 pr-2 font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.14em] ring-1 ring-inset transition-colors ${
          open ? "bg-primary text-on-primary ring-primary" : "ring-outline-variant/70 text-primary hover:ring-primary"
        }`
      }
      label="Sort products"
      onChange={onChange}
      options={sortOptions.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
    />
  );
}
