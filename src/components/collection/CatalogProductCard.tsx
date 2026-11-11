import type { MouseEvent } from "react";
import Image from "next/image";
import type { FilterableProduct } from "@/lib/catalog-filters";
import Stars from "@/components/product/Stars";
import WishlistButton from "../WishlistButton";
import { productId } from "@/lib/product-id";
import SalePrice, { DiscountBadge } from "@/components/SalePrice";

export default function CatalogProductCard({
  product: p,
  onQuickView,
}: {
  product: FilterableProduct;
  onQuickView: (size?: number) => void;
}) {
  // Any click on the card opens quick view, except on its own controls
  // (wishlist heart, quick-add sizes and the title button handle themselves).
  const handleCardClick = (e: MouseEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest("button, a")) return;
    onQuickView();
  };

  return (
    <article
      className="group relative flex flex-col bg-surface-container-lowest rounded-xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-outline-variant/20 hover:border-outline-variant/60 cursor-pointer"
      onClick={handleCardClick}
    >
      <div className="relative w-full aspect-[3/4] bg-surface-container-low overflow-hidden">
        <Image
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          alt={p.alt}
          src={p.image}
          fill
          sizes="(min-width: 1024px) 20vw, 50vw"
        />
        {p.badge && (
          <span
            className={`absolute top-2 left-2 sm:top-3 sm:left-3 max-w-[calc(100%-3.5rem)] truncate px-2 sm:px-2.5 py-0.5 sm:py-1 ${p.badgeClass} font-label-uppercase text-[9px] sm:text-[10px] uppercase tracking-wider rounded-full shadow-sm`}
          >
            {p.badge}
          </span>
        )}
        <DiscountBadge className="top-9 left-2 sm:top-12 sm:left-3 px-2! text-[9px]! sm:px-2.5! sm:text-[10px]!" percent={p.discountPercent} />
        <WishlistButton
          variant="catalog"
          item={{
            id: productId(p.name, p.href),
            name: p.name,
            price: p.price,
            image: p.image,
            alt: p.alt,
            href: p.href,
            detail: p.material,
          }}
        />
        {/* Quick View & 360° trigger (revealed on hover / keyboard focus) */}
        <button
          aria-haspopup="dialog"
          aria-label={`Quick view ${p.name}`}
          className="absolute inset-x-4 top-1/2 -translate-y-1/2 py-2 px-4 bg-surface-container-lowest/90 backdrop-blur-md text-primary font-label-uppercase text-xs tracking-wider rounded-full opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-primary hover:text-on-primary transition-all duration-300 shadow-md hidden sm:flex items-center justify-center gap-1.5 cursor-pointer z-10"
          onClick={() => onQuickView()}
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">360</span>
          <span>Quick View</span>
        </button>
        {/* Quick Size Overlay */}
        <div className="absolute inset-x-3 bottom-3 translate-y-12 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 hidden sm:flex flex-col gap-1.5 p-2 bg-surface-container-lowest/95 backdrop-blur-md rounded-lg shadow-md">
          <span className="text-[10px] font-label-uppercase uppercase text-outline tracking-wider text-center">
            Quick Add (EU Size)
          </span>
          <div className="grid grid-cols-4 gap-1">
            {p.quickSizes.map((size) => (
              <button
                key={size}
                aria-label={`Quick add size ${size}`}
                className={`py-1 text-xs rounded ${
                  size === p.quickSelected
                    ? "bg-primary text-on-primary"
                    : "bg-surface-container hover:bg-primary hover:text-on-primary transition-colors"
                }`}
                onClick={() => onQuickView(size)}
                type="button"
              >
                {size}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="p-space-sm sm:p-space-md flex flex-col flex-1 justify-between gap-space-xs sm:gap-space-sm">
        <div>
          <div className="flex items-center justify-between gap-2 text-outline text-[10px] sm:text-[11px] font-label-uppercase uppercase tracking-wider mb-1">
            <span className="truncate">{p.spec}</span>
            <span className={`hidden sm:inline whitespace-nowrap ${p.tagClass ?? ""}`}>{p.tag}</span>
          </div>
          <h3 className="font-headline-sm text-body-lg sm:text-headline-sm text-primary tracking-tight leading-snug group-hover:text-secondary transition-colors">
            <button
              aria-haspopup="dialog"
              className="text-left cursor-pointer"
              onClick={() => onQuickView()}
              type="button"
            >
              {p.name}
            </button>
          </h3>
          <p className="hidden sm:block font-body-sm text-xs text-on-surface-variant mt-0.5">
            {p.material}
          </p>
          {p.rating && p.rating.count > 0 && (
            <div className="flex items-center gap-1 mt-1 text-[11px] text-on-surface-variant">
              <Stars size="text-[13px]" value={p.rating.average} />
              <span>
                {p.rating.average.toFixed(1)} ({p.rating.count})
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center justify-between pt-space-xs border-t border-outline-variant/20">
          <span className="font-body-md text-body-md sm:font-body-lg sm:text-body-lg text-primary font-medium">
            <SalePrice price={p.price} compareAt={p.compareAt} discountPercent={p.discountPercent} />
          </span>
          {p.sold ? (
            <span className="font-label-uppercase text-[10px] text-secondary tracking-wider uppercase whitespace-nowrap">
              {p.sold.toLocaleString("en-US")} sold
            </span>
          ) : (
            <span className="hidden sm:inline font-label-uppercase text-[10px] text-secondary tracking-widest uppercase">
              360° View
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
