"use client";

import Link from "next/link";
import { Suspense, useCallback, useState } from "react";
import { useBagCount, useWishlist } from "@/lib/store";
import ActiveMark from "./ActiveMark";
import CurrencySwitch from "./CurrencySwitch";
import dynamic from "next/dynamic";

// Loaded the first time someone opens search.
const SearchPanel = dynamic(() => import("./SearchPanel"), { ssr: false });
import type { SearchEntry } from "@/lib/search-data";

const iconBtn =
  "p-space-xs text-on-surface-variant hover:text-on-surface transition-colors flex items-center";
const counter =
  "absolute top-0 right-0 w-3.5 h-3.5 rounded-full font-label-uppercase text-[9px] flex items-center justify-center font-medium leading-none";

export default function HeaderActions({
  searchIndex,
}: {
  searchIndex: SearchEntry[];
}) {
  const bagCount = useBagCount();
  const wishCount = useWishlist().length;
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchUsed, setSearchUsed] = useState(false);
  const closeSearch = useCallback(() => setSearchOpen(false), []);

  return (
    <>
      <CurrencySwitch className="hidden xl:flex" />
      <div className="hidden xl:block h-3.5 w-px bg-outline-variant/40 ml-space-xs mr-space-xs" />
      <button
        aria-expanded={searchOpen}
        aria-haspopup="dialog"
        aria-label="Search"
        className={iconBtn}
        onClick={() => {
          setSearchUsed(true);
          setSearchOpen((o) => !o);
        }}
        type="button"
      >
        <span className="material-symbols-outlined text-[20px]">search</span>
      </button>
      <Link
        aria-label={`Wishlist (${wishCount} saved)`}
        // Phones: the wishlist lives in the menu, so the longer logo fits.
        className={`${iconBtn} relative max-sm:hidden`}
        href="/wishlist"
      >
        <span className="material-symbols-outlined text-[20px]">favorite</span>
        {wishCount > 0 && (
          <span className={`${counter} bg-secondary text-on-secondary`}>
            {wishCount}
          </span>
        )}
        <Suspense fallback={null}>
          <ActiveMark href="/wishlist" />
        </Suspense>
      </Link>
      <Link
        aria-label={`Shopping Bag (${bagCount} items)`}
        className={`${iconBtn} relative`}
        href="/cart"
      >
        <span className="material-symbols-outlined text-[20px]">
          shopping_bag
        </span>
        {bagCount > 0 && (
          <span className={`${counter} bg-primary text-on-primary`}>
            {bagCount}
          </span>
        )}
        <Suspense fallback={null}>
          <ActiveMark href="/cart" />
        </Suspense>
      </Link>
      <Link aria-label="Account" className={`${iconBtn} relative`} href="/account">
        <span className="material-symbols-outlined text-[20px]">
          account_circle
        </span>
        <Suspense fallback={null}>
          <ActiveMark href="/account" />
        </Suspense>
      </Link>
      {searchUsed && <SearchPanel index={searchIndex} open={searchOpen} onClose={closeSearch} />}
    </>
  );
}
