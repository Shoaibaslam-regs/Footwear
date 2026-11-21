"use client";

import { requireLogin } from "@/lib/require-login";
import { useCallback, useEffect, useRef, useState } from "react";
import { useBottomBar } from "@/lib/use-bottom-bar";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetail } from "@/lib/product-data";
import { pkSize } from "@/lib/product-data";
import Stars from "./Stars";
import StockAlert from "./StockAlert";
import Accordion from "./Accordion";
import SizeGuideModal from "./SizeGuideModal";
import SalePrice, { OffChip, SaleTag } from "@/components/SalePrice";
import Price from "@/components/Price";
import { useCardPrice } from "@/components/sale/SaleProvider";
import { saleTime } from "@/lib/sale-events";
import { addToBag, openBag, toggleWishlist as toggleSaved, useInBag, useIsWishlisted } from "@/lib/store";

export default function PurchasePanel({ product }: { product: ProductDetail }) {
  // One colour per listing: shown as text, no palette to pick from.
  const color = product.defaultColor;
  const [size, setSize] = useState(product.defaultSize);
  const [added, setAdded] = useState(false);
  const saved = useIsWishlisted(product.slug);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const router = useRouter();
  const closeGuide = useCallback(() => setGuideOpen(false), []);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => setAdded(false), 1800);
    return () => clearTimeout(id);
  }, [added]);

  useEffect(() => {
    if (!tooltip) return;
    const id = setTimeout(() => setTooltip(null), 1500);
    return () => clearTimeout(id);
  }, [tooltip]);

  const cover = product.gallery[0];
  // Is the main Add to Bag on screen? (Phones show the bottom bar when it isn't.)
  const actions = useRef<HTMLDivElement>(null);
  const [actionsVisible, setActionsVisible] = useState(true);
  useEffect(() => {
    const el = actions.current;
    if (!el) return;
    // Checked on scroll (once per frame), not with an IntersectionObserver: a jump
    // straight past the buttons from below would never "cross" the screen.
    let frame = 0;
    const check = () => {
      frame = 0;
      setActionsVisible(el.getBoundingClientRect().bottom > 80); // still on screen (below the header) or not reached yet
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(check);
    };
    check();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  // The price right now, with any live sale event (the bag is re-priced on the server too).
  const live = useCardPrice(product);
  const euSize = size.startsWith("EU") ? size : `EU ${size}`;
  const inBag = useInBag(product.slug, euSize);

  const toggleWishlist = async () => {
    if (!(await requireLogin("save items to your wishlist"))) return;
    const added = toggleSaved({
      id: product.slug,
      name: product.name,
      price: live.price,
      image: cover.image,
      alt: cover.alt,
      href: `/products/${product.slug}`,
      detail: product.breadcrumbCategory,
    });
    setTooltip(added ? "Added to Wishlist" : "Removed from Wishlist");
  };

  const addSelectionToBag = async (goingToCheckout = false) => {
    if (!(await requireLogin("add items to your bag"))) return false;
    addToBag(
      {
        id: product.slug,
        name: product.name,
        price: live.price,
        image: cover.image,
        alt: cover.alt,
        size: euSize,
        color,
        href: `/products/${product.slug}`,
        collection: product.breadcrumbCategory,
      },
      1,
      { openBag: !goingToCheckout },
    );
    setAdded(true);
    return true;
  };

  const buyNow = async (e: React.MouseEvent) => {
    e.preventDefault();
    // Already in the bag in this size: go straight to checkout without adding a second pair.
    if (inBag || (await addSelectionToBag(true))) router.push("/checkout");
  };

  return (
    <div className="lg:col-span-5 flex flex-col gap-space-md sm:gap-space-lg lg:sticky lg:top-28">
      {/* Phones: once the main buttons scroll away, a slim bar keeps Add to Bag in reach. */}
      {!actionsVisible && (
        <BuyBar inBag={inBag} label={added ? "Added to Bag" : inBag ? "In Bag · View" : "Add to Bag"} onAdd={() => (inBag ? openBag() : addSelectionToBag())}>
          <span className="inline-flex items-center gap-2">
            <SalePrice compareAt={live.compareAt} price={live.price} quiet />
            {live.sale && <SaleTag tag={live.sale.tag} />}
          </span>
        </BuyBar>
      )}
      {/* Header Info */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between gap-space-sm">
          <span className="min-w-0 truncate font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.14em] sm:tracking-[0.2em] text-[10px] sm:text-[11px]">
            {product.eyebrow}
          </span>
          {product.reviewCount > 0 ? (
            <a
              className="shrink-0 flex items-center gap-1 font-label-uppercase text-label-uppercase text-on-surface text-xs hover:text-primary"
              href="#reviews-anchor"
            >
              <Stars className="text-sm" size="text-[16px]" value={product.rating} />
              <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
              <span className="text-on-surface-variant underline underline-offset-2 ml-1">({product.reviewCount})</span>
            </a>
          ) : (
            <a
              className="shrink-0 whitespace-nowrap font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-wider text-on-surface-variant hover:text-primary underline underline-offset-2"
              href="#reviews-anchor"
            >
              <span className="sm:hidden">Write a review</span>
              <span className="hidden sm:inline">Be the first to review</span>
            </a>
          )}
        </div>
        <h1 className="font-headline-lg text-[28px] leading-tight sm:text-[36px] sm:leading-[44px] text-primary tracking-tight font-normal">
          {product.name}
        </h1>
        {/* Price line: gold price, the old price struck through (never red) and the percent beside
            them; the sale's 12.12 at the right end. Mini sale plaques while a sale sets the price,
            else the plain percent. Then when the sale ends. */}
        <div className="pt-space-xs flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            {/* Price, the old price, "Tax included" (larger screens), then the percent (owner, 2026-11-18). */}
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-2.5 gap-y-1.5 min-w-0">
              <span className="font-headline-sm text-[22px] sm:text-[24px] leading-none font-normal tabular-nums text-secondary whitespace-nowrap">
                <Price amount={live.price} />
              </span>
              {live.compareAt && live.compareAt > live.price ? (
                <s className="font-headline-sm text-[16px] sm:text-[17px] leading-none text-outline tabular-nums whitespace-nowrap">
                  <span className="sr-only">was </span>
                  <Price amount={live.compareAt} />
                </s>
              ) : null}
              {/* "Tax included" and the percent move as one unit, so the percent always follows it. */}
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <span className="hidden sm:inline font-body-sm text-[12px] text-on-surface-variant">Tax included</span>
                <OffChip percent={live.discountPercent || undefined} sale={!!live.sale} />
              </span>
            </div>
            {live.sale && <SaleTag className="shrink-0" tag={live.sale.tag} />}
          </div>
          {live.sale && (
            <p className="flex items-center gap-1.5 font-label-uppercase text-[10px] sm:text-[11px] leading-snug uppercase tracking-[0.1em] sm:tracking-[0.18em] text-secondary">
              <span aria-hidden="true" className="material-symbols-outlined text-[15px] shrink-0">
                schedule
              </span>
              <span>
                {live.sale.name} ends {saleTime(live.sale.endsAt)}
              </span>
            </p>
          )}
        </div>
        {product.sold ? (
          <p className="flex items-center gap-1.5 py-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-secondary">local_mall</span>
            <span>
              <span className="text-primary font-medium">{product.sold.toLocaleString("en-US")}</span>{" "}
              {product.sold === 1 ? "pair" : "pairs"} sold
            </span>
          </p>
        ) : null}
      </div>

      {/* Colour (text only) */}
      <p className="font-label-uppercase text-label-uppercase text-primary uppercase tracking-widest text-[11px]">
        Color: <span className="font-normal text-on-surface-variant">{color}</span>
      </p>

      {/* Size Matrix */}
      <div className="space-y-space-sm pt-space-xs">
        <div className="flex justify-between items-center">
          <span className="font-label-uppercase text-label-uppercase text-primary uppercase tracking-widest text-[11px]">
            Choose Size (EU)
          </span>
          <button
            className="flex items-center gap-1 font-label-uppercase text-label-uppercase text-secondary hover:text-primary transition-colors uppercase text-[11px] underline underline-offset-4"
            onClick={() => setGuideOpen(true)}
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">
              straighten
            </span>
            <span>Size Guide</span>
          </button>
        </div>
        <div
          aria-label="Shoe Sizes"
          className={`grid ${product.sizes.length >= 6 ? "grid-cols-7" : "grid-cols-5"} gap-1 sm:gap-1.5`}
          role="radiogroup"
        >
          {product.sizes.map((s) => {
            const isActive = s.size === size;
            return (
              <button
                key={s.size}
                aria-checked={isActive}
                aria-disabled={s.soldOut || undefined}
                aria-label={`EU ${s.size}${s.soldOut ? ", sold out" : s.left ? `, only ${s.left} left` : ""}`}
                className={`relative h-11 sm:h-12 flex flex-col items-center justify-center font-body-sm text-[14px] transition-colors ${
                  s.soldOut
                    ? "text-outline/60 line-through cursor-not-allowed"
                    : isActive
                      ? "bg-primary text-on-primary"
                      : "ring-1 ring-inset ring-outline-variant/70 hover:ring-primary text-on-surface"
                }`}
                disabled={s.soldOut}
                onClick={() => setSize(s.size)}
                role="radio"
                type="button"
              >
                <span>{s.size}</span>
                {s.lowStock && (
                  <span className={`absolute bottom-0.5 inset-x-0 text-center text-[9px] leading-none font-label-uppercase ${isActive ? "text-secondary-fixed" : "text-error"}`}>
                    {s.left} left
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <StockAlert slug={product.slug} soldOut={product.sizes.filter((s) => s.soldOut).map((s) => s.size)} />
        {pkSize(size) && (
          <p aria-live="polite" className="font-body-sm text-body-sm text-on-surface-variant">
            Selected <strong className="text-primary">EU {size}</strong> = Pakistani size{" "}
            <strong className="text-primary">{pkSize(size)}</strong>
          </p>
        )}
        <div className="flex items-start gap-1.5 font-body-sm text-[13px] text-on-surface-variant">
          <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary shrink-0 mt-0.5">
            straighten
          </span>
          <span>
            <span className="text-primary font-medium">Fit tip:</span> {product.fitInsight}
          </span>
        </div>
      </div>

      {/* One clear action: Add to Bag (with the heart beside it), Buy Now as an outline.
          The bag lets her change the quantity, so there is no stepper here. */}
      <div className="flex flex-col gap-2" ref={actions}>
        <div className="flex items-stretch gap-2">
          <button
            className="skin-cta flex-1 h-12 sm:h-[52px] bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed font-label-uppercase text-[11px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center gap-2"
            onClick={() => (inBag ? openBag() : addSelectionToBag())}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
              {inBag ? "check" : "shopping_bag"}
            </span>
            <span aria-live="polite">{added ? "Added to Bag" : inBag ? "In Bag · View" : "Add to Bag"}</span>
          </button>
          <button
            aria-label={saved ? "Remove from Wishlist" : "Add to Wishlist"}
            aria-pressed={saved}
            className="relative w-12 sm:w-[52px] shrink-0 ring-1 ring-inset ring-outline-variant/80 hover:ring-primary text-primary flex items-center justify-center transition-colors"
            onClick={toggleWishlist}
            type="button"
          >
            <span aria-hidden="true" className={`material-symbols-outlined text-[21px]${saved ? " icon-filled text-secondary" : ""}`}>
              favorite
            </span>
            <span
              aria-live="polite"
              className={`absolute -top-8 right-0 px-2 py-1 bg-primary text-on-primary text-[10px] font-label-uppercase uppercase tracking-wider pointer-events-none transition-opacity duration-200 whitespace-nowrap ${
                tooltip ? "opacity-100" : "opacity-0"
              }`}
            >
              {tooltip ?? "Added to Wishlist"}
            </span>
          </button>
        </div>
        <Link
          className="w-full h-12 sm:h-[52px] ring-1 ring-inset ring-primary text-primary hover:bg-primary hover:text-on-primary font-label-uppercase text-[11px] uppercase tracking-[0.2em] transition-colors flex items-center justify-center"
          href="/checkout"
          onClick={buyNow}
        >
          Buy Now
        </Link>
      </div>

      {/* Guarantees */}
      <ul className="border-y border-outline-variant/40 divide-y divide-outline-variant/30">
        {product.guarantees.map((g) => (
          <li key={g.title} className="flex items-start gap-space-sm py-space-sm">
            <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">{g.icon}</span>
            <p className="font-body-sm text-[13px] leading-relaxed text-on-surface-variant">
              <span className="text-primary font-medium">{g.title}</span> {g.text}
            </p>
          </li>
        ))}
      </ul>

      {/* Accordions */}
      <div className="-mt-space-sm sm:-mt-space-md">
        <Accordion
          title="Product Details & Materials"
          className="pb-space-md space-y-space-xs font-body-sm text-[13px] text-on-surface-variant"
        >
          <ul className="space-y-2 list-none">
            {product.specs.map((s) => (
              <li key={s.label} className="flex justify-between py-1">
                <span className="text-on-surface font-medium">{s.label}</span>
                <span>{s.value}</span>
              </li>
            ))}
          </ul>
        </Accordion>
        <Accordion
          title="Shoe Care"
          className="pb-space-md font-body-sm text-[13px] text-on-surface-variant space-y-space-xs"
        >
          {product.care.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Accordion>
        <Accordion
          title="Delivery & Returns"
          className="pb-space-md font-body-sm text-[13px] text-on-surface-variant space-y-space-xs"
        >
          {product.shipping.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Accordion>
      </div>

      <SizeGuideModal open={guideOpen} onClose={closeGuide} />
    </div>
  );
}

/** The phones' bottom bar: price on the left, Add to Bag on the right. */
function BuyBar({ children, label, inBag, onAdd }: { children: React.ReactNode; label: string; inBag: boolean; onAdd: () => void }) {
  useBottomBar(68);
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/50 pb-[env(safe-area-inset-bottom)]">
      <div className="h-[68px] px-margin-mobile flex items-center justify-between gap-space-md">
        <span className="min-w-0 font-body-md text-[15px] text-primary tabular-nums">{children}</span>
        <button
          className="skin-cta h-11 px-5 shrink-0 bg-primary text-on-primary font-label-uppercase text-[11px] uppercase tracking-[0.18em] flex items-center gap-2"
          onClick={onAdd}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
            {inBag ? "check" : "shopping_bag"}
          </span>
          {label}
        </button>
      </div>
    </div>
  );
}
