"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import type { CartItem } from "@/lib/cart-data";
import Price from "@/components/Price";
import { confirmRemoveFromBag } from "./confirmRemove";

export default function CartDrawer({
  open,
  onClose,
  items,
  pieces,
  subtotal,
}: {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  pieces: number;
  subtotal: number;
}) {
  useEffect(() => {
    if (!open) return;
    // Leave Escape to a confirmation popup when one is open on top.
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" &&
      !document.getElementById("dialog-title") &&
      onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        open ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Backdrop Scrim */}
      <div
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      {/* Drawer Panel */}
      <div
        aria-label="Shopping bag"
        aria-modal="true"
        role="dialog"
        className={`absolute top-0 right-0 h-full w-full max-w-md bg-surface-container-lowest shadow-xl flex flex-col justify-between transition-transform duration-300 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-space-lg flex items-center justify-between bg-surface-container-low shadow-sm">
          <div>
            <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest uppercase">
              Ŕose Atelier
            </span>
            <h3 className="font-headline-sm text-headline-sm text-primary">
              Shopping Bag ({pieces})
            </h3>
          </div>
          <button
            aria-label="Close shopping bag"
            className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors"
            onClick={onClose}
            tabIndex={open ? 0 : -1}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        {items.length === 0 ? (
          <div className="flex-1 p-space-lg flex flex-col items-center justify-center text-center gap-space-md">
            <span className="material-symbols-outlined text-secondary text-[40px]">
              shopping_bag
            </span>
            <p className="font-headline-sm text-headline-sm text-primary">
              Your bag is empty
            </p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              See our Spring Collection.
            </p>
            <Link
              className="h-12 px-8 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center"
              href="/collections"
              onClick={onClose}
              tabIndex={open ? 0 : -1}
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <div className="p-space-lg flex flex-col gap-space-md overflow-y-auto flex-1">
              {items.map((item) => (
                <div key={item.id} className="flex gap-space-md items-center">
                  <div className="relative w-20 h-24 bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      className="w-full h-full object-cover"
                      alt={item.thumbAlt}
                      src={item.thumb}
                      fill
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-body-md text-body-md font-medium text-primary truncate">
                      {item.drawerName}
                    </h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      {item.size} / {item.drawerColor}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-label-sm text-label-sm text-primary font-semibold">
                        <Price amount={item.price * item.quantity} />
                      </span>
                      <span className="font-label-sm text-label-sm text-outline">
                        Qty: {item.quantity}
                      </span>
                    </div>
                  </div>
                  <button
                    aria-label={`Remove ${item.drawerName} from bag`}
                    className="w-9 h-9 shrink-0 self-start rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-surface-container transition-colors"
                    onClick={() => confirmRemoveFromBag(item)}
                    tabIndex={open ? 0 : -1}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      delete
                    </span>
                  </button>
                </div>
              ))}
              <div className="p-space-sm bg-surface-container-low rounded-lg mt-space-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-[18px]">payments</span>
                <span className="font-label-sm text-label-sm text-primary font-medium">
                  Cash on Delivery, EasyPaisa &amp; JazzCash accepted
                </span>
              </div>
            </div>

            <div className="p-space-lg bg-surface-container-low flex flex-col gap-space-sm shadow-md">
              <div className="flex items-center justify-between">
                <span className="font-headline-sm text-headline-sm text-primary">
                  Subtotal
                </span>
                <span className="font-headline-sm text-headline-sm text-primary font-normal">
                  <Price amount={subtotal} />
                </span>
              </div>
              <p className="font-label-sm text-label-sm text-on-surface-variant">
                Delivery is added at checkout.
              </p>
              <div className="grid grid-cols-2 gap-space-sm mt-2">
                <Link
                  href="/cart"
                  onClick={onClose}
                  className="h-[52px] flex items-center justify-center bg-surface-container hover:bg-surface-container-high text-primary rounded-full font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors"
                  tabIndex={open ? 0 : -1}
                >
                  View Bag
                </Link>
                <Link
                  href="/checkout"
                  onClick={onClose}
                  className="h-[52px] flex items-center justify-center bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed rounded-full font-label-uppercase text-label-uppercase uppercase tracking-widest font-semibold transition-all duration-300"
                  tabIndex={open ? 0 : -1}
                >
                  Checkout
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
