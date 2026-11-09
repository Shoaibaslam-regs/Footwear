"use client";

import { requireLogin } from "@/lib/require-login";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { sizes, type BestSeller } from "@/lib/data";
import SalePrice, { DiscountBadge } from "@/components/SalePrice";
import { productId } from "@/lib/product-id";
import { addToBag } from "@/lib/store";

const chipBase =
  "w-10 h-10 rounded border-none font-label-sm text-label-sm font-medium";

/**
 * Best-seller card. On phones it is compact: square photo, size dropdown
 * instead of chips. `wide` (an odd last card spanning both phone columns)
 * lays out horizontally so it matches the other cards' height.
 */
export default function BestSellerCard({
  item,
  wide = false,
}: {
  item: BestSeller & { href?: string };
  wide?: boolean;
}) {
  const [selected, setSelected] = useState(item.defaultSize);
  const available = sizes.filter((s) => !item.soldOut.includes(s));
  // Never reserve a sold-out size, even if it was the listing's default.
  const size = available.includes(selected) ? selected : available[0];

  const reserve = async () => {
    if (!(await requireLogin("add this to your bag"))) return;
    addToBag({
      id: productId(item.name, item.href),
      name: item.name,
      price: item.price,
      image: item.image,
      alt: item.alt,
      size: `EU ${size}`,
      material: item.detail,
      href: item.href,
    });
  };

  return (
    <div
      className={`bg-surface-container-lowest rounded-xl p-space-sm md:p-space-md shadow-md flex justify-between gap-space-sm md:gap-0 md:flex-col ${
        wide ? "flex-row" : "flex-col"
      }`}
    >
      <div className={`relative overflow-hidden rounded-lg bg-surface-container shrink-0 md:w-full md:aspect-[4/5] md:mb-space-md ${
          wide ? "w-2/5 aspect-[4/5] self-start" : "w-full aspect-square"
        }`}
      >
        <Image
          className="img-fade w-full h-full object-cover"
          alt={item.alt}
          src={item.image}
          fill
          sizes="(min-width: 768px) 33vw, 50vw"
        />
        <span className="absolute top-2 left-2 md:top-3 md:left-3 max-w-[calc(100%-1rem)] truncate bg-secondary-container text-on-secondary-container px-2 md:px-2.5 py-0.5 md:py-1 rounded-full font-label-uppercase text-[9px] md:text-[10px] tracking-widest uppercase">
          {item.badge}
        </span>
        <DiscountBadge className="top-9 left-2 md:top-12 md:left-3 px-2! text-[9px]! md:px-2.5! md:text-[10px]!" percent={item.discountPercent} />
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div>
          <div className="flex flex-col md:flex-row md:justify-between md:items-baseline gap-0.5 mb-1">
            <h3 className="font-headline-sm text-body-lg md:text-headline-sm leading-snug text-primary line-clamp-2 md:line-clamp-none">
              {item.href ? (
                <Link className="link-draw hover:text-secondary transition-colors" href={item.href}>
                  {item.name}
                </Link>
              ) : (
                item.name
              )}
            </h3>
            <span className="font-label-md text-label-sm md:text-label-md font-semibold text-primary">
              <SalePrice price={item.price} compareAt={item.compareAt} discountPercent={item.discountPercent} />
            </span>
          </div>
          <p className="font-body-sm text-xs md:text-body-sm text-on-surface-variant mb-space-sm md:mb-space-md line-clamp-1 md:line-clamp-none">
            {item.detail}
          </p>
        </div>

        <div>
          {/* Phones: compact dropdown */}
          <label className="md:hidden block">
            <span className="sr-only">EU size for {item.name}</span>
            <select
              className="w-full h-9 px-2 rounded-lg bg-surface-container text-on-surface font-body-sm text-xs focus:outline-none focus:ring-2 focus:ring-secondary"
              onChange={(e) => setSelected(Number(e.target.value))}
              value={size ?? ""}
            >
              {sizes.map((size) => (
                <option key={size} disabled={item.soldOut.includes(size)} value={size}>
                  EU {size}
                  {item.soldOut.includes(size) ? " · sold out" : ""}
                </option>
              ))}
            </select>
          </label>

          {/* Tablet & desktop: size chips */}
          <div className="hidden md:block pt-space-xs">
            <span className="font-label-uppercase text-[10px] text-outline uppercase tracking-wider block mb-2">
              Choose EU Size:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {sizes.map((size) => {
                const soldOut = item.soldOut.includes(size);
                if (soldOut) {
                  return (
                    <button
                      key={size}
                      className={`${chipBase} bg-surface-container-highest text-outline opacity-40 cursor-not-allowed line-through`}
                      disabled
                      type="button"
                    >
                      {size}
                    </button>
                  );
                }
                const isSelected = size === selected || (size === available[0] && !available.includes(selected));
                return (
                  <button
                    key={size}
                    aria-pressed={isSelected}
                    className={`${chipBase} transition-colors ${
                      isSelected
                        ? "bg-primary text-on-primary"
                        : "bg-surface-container hover:bg-primary hover:text-on-primary"
                    }`}
                    onClick={() => setSelected(size)}
                    type="button"
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            className="w-full mt-2 md:mt-4 h-9 md:h-12 rounded-full bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed font-label-uppercase text-[11px] md:text-label-uppercase uppercase tracking-widest transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={available.length === 0}
            onClick={reserve}
            type="button"
          >
            <span className="material-symbols-outlined text-sm">shopping_bag</span>
            <span>
              {available.length === 0 ? "Sold Out" : "Add to Bag"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
