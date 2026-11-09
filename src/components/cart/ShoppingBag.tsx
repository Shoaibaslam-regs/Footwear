"use client";

import { requireLogin } from "@/lib/require-login";
import Link from "next/link";
import {
  lineProductId,
  removeFromBag,
  setBagQuantity,
  toggleWishlist,
  useBag,
} from "@/lib/store";
import { showToast } from "@/lib/toast";
import { confirmRemoveFromBag } from "./confirmRemove";
import CartItemCard from "./CartItemCard";
import Complements, { type Suggestion } from "./Complements";
import OrderSummary from "./OrderSummary";

export default function ShoppingBag({ suggestions }: { suggestions: Suggestion[] }) {
  const items = useBag();

  const pieces = items.reduce((n, i) => n + i.quantity, 0);
  const subtotal = items.reduce((n, i) => n + i.price * i.quantity, 0);

  const moveToWishlist = async (id: string) => {
    const item = items.find((i) => i.id === id);
    if (!item) return;
    if (!(await requireLogin("save pieces to your wishlist"))) return;
    toggleWishlist({
      id: lineProductId(id),
      name: item.name,
      price: item.price,
      image: item.image,
      alt: item.alt,
      href: item.href,
      detail: item.material,
    });
    removeFromBag(id);
    showToast("Moved to Atelier Wishlist");
  };

  return (
    <>
      <div className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pb-space-xl">
        {/* Progress Breadcrumb & Editorial Header */}
        <div className="pt-space-md pb-space-lg flex flex-col gap-space-md">
          <nav
            aria-label="Checkout progress"
            className="flex items-center gap-space-sm font-label-uppercase text-label-uppercase tracking-widest uppercase"
          >
            <span
              aria-current="step"
              className="flex items-center gap-1.5 text-primary font-semibold"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
              01. Shopping Bag
            </span>
            <span className="text-outline-variant select-none">/</span>
            <span className="text-outline hover:text-on-surface transition-colors cursor-default">
              02. Shipping Concierge
            </span>
            <span className="text-outline-variant select-none">/</span>
            <span className="text-outline hover:text-on-surface transition-colors cursor-default">
              03. Secure Settlement
            </span>
          </nav>

          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md pt-space-xs">
            <div>
              <span className="font-label-uppercase text-label-uppercase text-secondary tracking-[0.25em] uppercase">
                Your Selection
              </span>
              <h1 className="font-headline-lg text-headline-lg text-primary mt-1 tracking-tight">
                Your Shopping Bag
              </h1>
            </div>
          </div>

        </div>

        {items.length === 0 ? (
          <div className="bg-surface-container-lowest p-space-xl rounded-xl shadow-sm flex flex-col items-center text-center gap-space-md">
            <span className="material-symbols-outlined text-secondary text-[40px]">
              shopping_bag
            </span>
            <h2 className="font-headline-sm text-headline-sm text-primary">
              Your bag is empty
            </h2>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
              Discover our latest silhouettes in the collection.
            </p>
            <Link
              className="px-8 py-4 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-xl"
              href="/collections"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-start">
            {/* LEFT: Bag Contents & Cross-Sell */}
            <section className="lg:col-span-7 flex flex-col gap-space-lg">
              <div className="flex flex-col gap-space-md">
                {items.map((item) => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onQuantity={(q) => setBagQuantity(item.id, q)}
                    onRemove={() => confirmRemoveFromBag(item)}
                    onMoveToWishlist={() => moveToWishlist(item.id)}
                  />
                ))}
              </div>

              <Complements
                suggestions={suggestions
                  .filter((s) => !items.some((i) => lineProductId(i.id) === s.slug))
                  .slice(0, 3)}
              />
            </section>

            {/* RIGHT: Checkout Summary */}
            <OrderSummary pieces={pieces} subtotal={subtotal} />
          </div>
        )}

      </div>

    </>
  );
}
