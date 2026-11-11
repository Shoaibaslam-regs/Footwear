"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import { navLinks } from "@/lib/data";
import CurrencySwitch from "./CurrencySwitch";
import { onPath, useActiveNav } from "./useActiveNav";
import { useDialog } from "./useDialog";

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  return (
    <div className="lg:hidden flex items-center">
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label="Open Menu"
        className="p-space-xs text-on-surface"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="material-symbols-outlined text-[24px]">menu</span>
      </button>
      {open && createPortal(<MenuPanel onClose={close} />, document.body)}
    </div>
  );
}

function MenuPanel({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const current = useActiveNav();
  const panelRef = useDialog<HTMLDivElement>(true, onClose);

  return (
    <div className="fixed inset-0 z-[60] lg:hidden">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-primary/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        aria-label="Main menu"
        aria-modal="true"
        className="absolute inset-y-0 left-0 w-full max-w-sm bg-primary-container text-primary-fixed flex flex-col shadow-2xl"
        ref={panelRef}
        role="dialog"
      >
        <div className="h-20 px-margin-mobile flex items-center justify-between">
          <span className="font-headline-md text-[20px] tracking-[0.16em] uppercase text-surface-container-lowest whitespace-nowrap">
            Ŕose Atelier
          </span>
          <button
            aria-label="Close Menu"
            className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-surface-container-lowest/10 transition-colors"
            onClick={onClose}
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">close</span>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-margin-mobile pt-space-lg flex flex-col gap-space-md">
          {navLinks.map((link) => {
            const active = current === link.href;
            return (
              <Link
                key={link.label}
                aria-current={active ? "page" : undefined}
                className={`relative flex items-center gap-space-sm font-headline-md text-headline-md transition-colors hover:text-secondary-fixed ${
                  active ? "text-secondary-fixed" : "text-surface-container-lowest"
                }`}
                href={link.href}
                onClick={onClose}
              >
                {/* Gold marker beside the current page */}
                <span
                  aria-hidden="true"
                  className={`h-6 w-0.5 rounded-full bg-secondary-fixed transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                />
                {link.label}
              </Link>
            );
          })}
          <div className="h-px bg-surface-container-lowest/15 my-space-sm" />
          {[
            { label: "Wishlist", href: "/wishlist", icon: "favorite" },
            { label: "Shopping Bag", href: "/cart", icon: "shopping_bag" },
            { label: "Account", href: "/account", icon: "account_circle" },
          ].map((l) => {
            const active = onPath(pathname, l.href);
            return (
              <Link
                key={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-space-sm font-label-uppercase text-label-uppercase uppercase tracking-widest hover:text-secondary-fixed transition-colors ${
                  active ? "text-secondary-fixed" : ""
                }`}
                href={l.href}
                onClick={onClose}
              >
                <span className={`material-symbols-outlined text-[18px] ${active ? "icon-filled" : ""}`}>{l.icon}</span>
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-margin-mobile py-space-lg flex items-center justify-between">
          <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-primary-fixed-dim">
            Currency
          </span>
          <CurrencySwitch className="[&_button[aria-pressed=true]]:text-secondary-fixed [&_button]:text-primary-fixed-dim" />
        </div>
      </div>
    </div>
  );
}
