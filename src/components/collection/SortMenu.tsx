"use client";

import SelectMenu from "@/components/SelectMenu";
import { sortOptions, type SortOption } from "@/lib/catalog-filters";

/** The shop's sort control: the shared themed dropdown (components/SelectMenu.tsx). */
export default function SortMenu({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  return (
    <SelectMenu
      buttonClassName={(open) =>
        `h-9 flex items-center gap-1.5 pl-space-md pr-space-sm rounded-full font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-wider transition-colors ${
          open ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
        }`
      }
      label="Sort products"
      onChange={onChange}
      options={sortOptions.map((o) => ({ value: o.value, label: o.label }))}
      value={value}
    />
  );
}
