"use client";

import { requireLogin } from "@/lib/require-login";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetail } from "@/lib/product-data";
import { pkSize } from "@/lib/product-data";
import Stars from "./Stars";
import StockAlert from "./StockAlert";
import Accordion from "./Accordion";
import SizeGuideModal from "./SizeGuideModal";
import SalePrice from "@/components/SalePrice";
import { addToBag, openBag, toggleWishlist as toggleSaved, useInBag, useIsWishlisted } from "@/lib/store";

const MAX_QTY = 5;

export default function PurchasePanel({ product }: { product: ProductDetail }) {
  const [color, setColor] = useState(product.defaultColor);
  const [size, setSize] = useState(product.defaultSize);
  const [qty, setQty] = useState(1);
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
  const euSize = size.startsWith("EU") ? size : `EU ${size}`;
  const inBag = useInBag(product.slug, euSize);

  const toggleWishlist = async () => {
    if (!(await requireLogin("save items to your wishlist"))) return;
    const added = toggleSaved({
      id: product.slug,
      name: product.name,
      price: product.price,
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
        price: product.price,
        image: cover.image,
        alt: cover.alt,
        size: euSize,
        color,
        href: `/products/${product.slug}`,
        collection: product.breadcrumbCategory,
      },
      qty,
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
    <div className="lg:col-span-5 flex flex-col gap-space-lg lg:sticky lg:top-28">
      {/* Header Info */}
      <div className="space-y-space-xs">
        <div className="flex items-center justify-between">
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em] text-[11px]">
            {product.eyebrow}
          </span>
          {product.reviewCount > 0 ? (
            <a
              className="flex items-center gap-1 font-label-uppercase text-label-uppercase text-on-surface text-xs hover:text-primary"
              href="#reviews-anchor"
            >
              <Stars className="text-sm" size="text-[16px]" value={product.rating} />
              <span className="ml-1 font-semibold">{product.rating.toFixed(1)}</span>
              <span className="text-on-surface-variant underline underline-offset-2 ml-1">({product.reviewCount})</span>
            </a>
          ) : (
            <a
              className="font-label-uppercase text-[11px] uppercase tracking-wider text-on-surface-variant hover:text-primary underline underline-offset-2"
              href="#reviews-anchor"
            >
              Be the first to review
            </a>
          )}
        </div>
        <h1 className="font-headline-lg text-headline-lg text-primary tracking-tight font-normal">
          {product.name}
        </h1>
        <div className="flex items-baseline gap-space-sm pt-space-xs">
          <span className="font-headline-md text-headline-md text-primary font-normal">
            <SalePrice price={product.price} compareAt={product.compareAt} discountPercent={product.discountPercent} />
          </span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Tax included
          </span>
        </div>
        {product.sold ? (
          <p className="flex items-center gap-1.5 py-space-xs font-body-sm text-body-sm text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-secondary">local_mall</span>
            <span>
              <strong className="text-primary font-semibold">{product.sold.toLocaleString("en-US")}</strong>{" "}
              {product.sold === 1 ? "pair" : "pairs"} sold
            </span>
          </p>
        ) : null}
      </div>

      {/* Color Selection */}
      <div className="space-y-space-sm pt-space-xs">
        <div className="flex justify-between items-center">
          <span className="font-label-uppercase text-label-uppercase text-primary uppercase tracking-widest text-[11px]">
            Color:{" "}
            <span className="font-normal text-on-surface-variant">{color}</span>
          </span>
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase text-[10px] tracking-wider">
            Only at Ŕose Atelier
          </span>
        </div>
        <div
          aria-label="Available Colors"
          className="flex items-center gap-space-sm"
          role="radiogroup"
        >
          {product.colors.map((c) => {
            const isActive = c.name === color;
            return (
              <button
                key={c.name}
                aria-checked={isActive}
                aria-label={c.name}
                className={`relative w-10 h-10 rounded-full p-0.5 ring-offset-2 ring-offset-surface focus:outline-none transition-all ${
                  isActive
                    ? "ring-2 ring-primary"
                    : "ring-1 ring-transparent hover:ring-outline-variant"
                }`}
                onClick={() => setColor(c.name)}
                role="radio"
                title={c.name}
                type="button"
              >
                <span
                  className="block w-full h-full rounded-full shadow-inner"
                  style={{ backgroundColor: c.hex }}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Size Matrix */}
      <div className="space-y-space-sm pt-space-xs">
        <div className="flex justify-between items-center">
          <span className="font-label-uppercase text-label-uppercase text-primary uppercase tracking-widest text-[11px]">
            Choose Your Size (EU)
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
          className="grid grid-cols-5 gap-space-xs"
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
                className={`relative h-12 flex flex-col items-center justify-center font-body-sm text-body-sm transition-colors ${
                  s.soldOut
                    ? "bg-surface-container text-outline line-through cursor-not-allowed opacity-50"
                    : isActive
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-lowest hover:bg-surface-container-high text-on-surface"
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
        <div className="p-space-sm bg-surface-container-low flex items-start gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px] text-secondary shrink-0 mt-0.5">
            verified_user
          </span>
          <span>
            <strong>Fit Tip:</strong> {product.fitInsight}
          </span>
        </div>
      </div>

      {/* Quantity & CTAs */}
      <div className="space-y-space-sm pt-space-xs">
        <div className="flex items-center gap-space-sm">
          <div className="flex items-center bg-surface-container-lowest h-[52px] px-space-xs">
            <button
              aria-label="Decrease quantity"
              className="w-9 h-full flex items-center justify-center text-on-surface hover:text-primary transition-colors text-lg"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              type="button"
            >
              −
            </button>
            <span
              aria-live="polite"
              className="w-8 text-center font-body-md text-body-md font-medium text-on-surface"
            >
              {qty}
            </span>
            <button
              aria-label="Increase quantity"
              className="w-9 h-full flex items-center justify-center text-on-surface hover:text-primary transition-colors text-lg"
              onClick={() => setQty((q) => Math.min(MAX_QTY, q + 1))}
              type="button"
            >
              +
            </button>
          </div>
          <button
            className="flex-1 h-[52px] bg-primary-container text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-space-sm shadow-sm"
            onClick={() => (inBag ? openBag() : addSelectionToBag())}
            type="button"
          >
            <span className="material-symbols-outlined text-[18px]">
              {inBag ? "check" : "shopping_bag"}
            </span>
            <span aria-live="polite">
              {added ? "Added to Bag ✓" : inBag ? "In Your Bag · View" : "Add to Bag"}
            </span>
          </button>
          <button
            aria-label={saved ? "Remove from Wishlist" : "Add to Wishlist"}
            aria-pressed={saved}
            className="relative w-[52px] h-[52px] bg-surface-container-lowest text-on-surface-variant hover:text-primary flex items-center justify-center transition-colors group"
            onClick={toggleWishlist}
            type="button"
          >
            <span
              className={`material-symbols-outlined text-[22px]${
                saved ? " icon-filled text-secondary" : ""
              }`}
            >
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
          href="/checkout"
          onClick={buyNow}
          className="w-full h-[52px] bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary hover:text-on-secondary font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-space-sm"
        >
          <span className="material-symbols-outlined text-[18px]">bolt</span>
          <span>Buy Now</span>
        </Link>
      </div>

      {/* Guarantees */}
      <div className="p-space-md bg-surface-container-lowest space-y-space-sm">
        {product.guarantees.map((g) => (
          <div key={g.title} className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-[20px] text-secondary shrink-0">
              {g.icon}
            </span>
            <div className="font-body-sm text-body-sm text-on-surface">
              <strong>{g.title}</strong> {g.text}
            </div>
          </div>
        ))}
      </div>

      {/* Accordions */}
      <div className="space-y-space-xs pt-space-xs">
        <Accordion
          title="Product Details & Materials"
          className="px-space-md pb-space-md space-y-space-xs font-body-sm text-body-sm text-on-surface-variant"
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
          title="How to Care for Your Shoes"
          className="px-space-md pb-space-md font-body-sm text-body-sm text-on-surface-variant space-y-space-xs"
        >
          {product.care.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </Accordion>
        <Accordion
          title="Delivery & Returns"
          className="px-space-md pb-space-md font-body-sm text-body-sm text-on-surface-variant space-y-space-xs"
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
