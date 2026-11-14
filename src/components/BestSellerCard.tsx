"use client";

import { requireLogin } from "@/lib/require-login";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { sizes, type BestSeller } from "@/lib/data";
import SalePrice from "@/components/SalePrice";
import SelectMenu from "@/components/SelectMenu";
import { useCardPrice } from "@/components/sale/SaleProvider";
import { quietPrice } from "@/lib/home-type";
import { productId } from "@/lib/product-id";
import { addToBag, openBag, useInBag } from "@/lib/store";

const chipBase = "w-full h-9 ring-1 ring-inset ring-outline-variant/60 font-body-sm text-[12px] font-normal";

/**
 * Best-seller card. On phones it is compact: square photo, size dropdown
 * instead of chips. `wide` (an odd last card spanning both phone columns)
 * lays out horizontally so it matches the other cards' height.
 */
export default function BestSellerCard({
  item,
  wide = false,
}: {
  item: BestSeller & { href?: string; hoverImage?: string; slug?: string; category?: string };
  wide?: boolean;
}) {
  const [selected, setSelected] = useState(item.defaultSize);
  const available = sizes.filter((s) => !item.soldOut.includes(s));
  // Never reserve a sold-out size, even if it was the listing's default.
  const size = available.includes(selected) ? selected : available[0];

  const id = productId(item.name, item.href);
  // A live sale event (if any) prices this pair; the bag is re-priced on the server too.
  const live = useCardPrice(item);
  const inBag = useInBag(id, `EU ${size}`);

  const reserve = async () => {
    if (inBag) return openBag();
    if (!(await requireLogin("add this to your bag"))) return;
    addToBag({
      id,
      name: item.name,
      price: live.price,
      image: item.image,
      alt: item.alt,
      size: `EU ${size}`,
      material: item.detail,
      href: item.href,
    });
  };

  return (
    // Quiet card: no box or shadow; the photo, the name, a light price.
    <div className={`group flex justify-between gap-space-sm md:gap-0 md:flex-col ${wide ? "flex-row" : "flex-col"}`}>
      <div
        className={`relative overflow-hidden rounded-lg bg-surface-container shrink-0 md:w-full md:aspect-[4/5] md:mb-space-md ${
          wide ? "w-2/5 aspect-[4/5] self-start" : "w-full aspect-square"
        }`}
      >
        <Image
          className="img-scale w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          alt={item.alt}
          src={item.image}
          fill
          sizes="(min-width: 768px) 33vw, 50vw"
        />
        {item.hoverImage && (
          <Image
            alt=""
            aria-hidden="true"
            className="object-cover [clip-path:inset(0_0_0_100%)] group-hover:[clip-path:inset(0)] transition-[clip-path] duration-700 ease-[var(--ease-lux)] motion-reduce:transition-none"
            fill
            sizes="(min-width: 768px) 33vw, 50vw"
            src={item.hoverImage}
          />
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-between">
        <div className="px-0.5">
          <h3 className="font-headline-sm text-[16px] md:text-[22px] leading-snug text-primary tracking-[-0.01em] font-normal line-clamp-2 md:line-clamp-none">
            {item.href ? (
              <Link className="link-draw" href={item.href}>
                {item.name}
              </Link>
            ) : (
              item.name
            )}
          </h3>
          <p className="hidden sm:block font-body-sm text-[12px] md:text-body-sm text-on-surface-variant font-light mt-0.5 sm:line-clamp-1 md:line-clamp-none">
            {item.detail}
          </p>
          <span className={`${quietPrice} block mt-1`}>
            <SalePrice category={item.category} compareAt={item.compareAt} discountPercent={item.discountPercent} price={item.price} quiet slug={item.slug} />
          </span>
        </div>

        <div>
          {/* Phones: the themed dropdown (sold-out sizes shown, not selectable) */}
          <div className="md:hidden mt-2">
            <SelectMenu
              align="stretch"
              buttonClassName={(open) =>
                `w-full h-9 px-2.5 flex items-center justify-between gap-1 font-label-uppercase text-[10px] uppercase tracking-[0.18em] ring-1 ring-inset transition-colors ${
                  open ? "ring-primary text-primary" : "ring-outline-variant text-on-surface"
                }`
              }
              label={`EU size for ${item.name}`}
              onChange={setSelected}
              options={sizes.map((s) => ({ value: s, label: `EU ${s}`, disabled: item.soldOut.includes(s), note: item.soldOut.includes(s) ? "Sold out" : undefined }))}
              value={size ?? sizes[0]}
            />
          </div>

          {/* Tablet & desktop: small outlined size squares */}
          <div className="hidden md:block pt-space-sm">
            <span className="font-label-uppercase text-[9px] text-outline uppercase tracking-[0.24em] block mb-2">EU Size</span>
            {/* All seven sizes on one row, however narrow the card (New Arrivals has four per row). */}
            <div className="grid grid-cols-7 gap-1">
              {sizes.map((size) => {
                const soldOut = item.soldOut.includes(size);
                if (soldOut) {
                  return (
                    <button key={size} className={`${chipBase} text-outline/60 line-through cursor-not-allowed`} disabled type="button">
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
                      isSelected ? "bg-primary text-on-primary ring-primary" : "text-on-surface hover:ring-primary"
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

          {/* A thin outlined button that fills on hover, instead of a heavy black pill. */}
          <button
            className="btn-fill w-full mt-2 md:mt-space-md h-9 md:h-11 ring-1 ring-inset ring-primary text-primary font-label-uppercase text-[10px] md:text-[11px] uppercase tracking-[0.22em] flex items-center justify-center gap-2 disabled:opacity-50"
            disabled={available.length === 0}
            onClick={reserve}
            type="button"
          >
            <span className="material-symbols-outlined text-[15px]">{inBag ? "check" : "shopping_bag"}</span>
            <span>{available.length === 0 ? "Sold Out" : inBag ? "In Bag · View" : "Add to Bag"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
