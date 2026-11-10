"use client";

import { requireLogin } from "@/lib/require-login";
import Price from "@/components/Price";
import { addToBag, openBag, useInBag, type BagProduct } from "@/lib/store";

const DEFAULT_SIZE = "EU 38";

export default function QuickAddButton({
  product,
}: {
  product: Omit<BagProduct, "size">;
}) {
  const inBag = useInBag(product.id, DEFAULT_SIZE);
  return (
    <button
      className="w-full h-11 bg-primary-container hover:bg-secondary-fixed text-surface hover:text-on-secondary-fixed font-label-uppercase text-label-uppercase uppercase tracking-wider rounded-full transition-all flex items-center justify-center gap-1 shadow-md"
      onClick={async () => {
        if (inBag) return openBag();
        if (!(await requireLogin("add items to your bag"))) return;
        addToBag({ ...product, size: DEFAULT_SIZE });
      }}
      type="button"
    >
      <span className="material-symbols-outlined text-sm">{inBag ? "check" : "shopping_bag"}</span>
      {inBag ? "In Your Bag · View" : <>Quick Add • <Price amount={product.price} /></>}
    </button>
  );
}
