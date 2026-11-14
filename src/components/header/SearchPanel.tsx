"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import SalePrice from "@/components/SalePrice";
import { searchProducts, trendingSearches, type SearchEntry } from "@/lib/search-data";

const MAX_RESULTS = 6;

/**
 * Search dropdown anchored under the header (not a full-screen takeover).
 * Combobox pattern: ↑/↓ to move, Enter to open, Esc to close.
 */
export default function SearchPanel({
  index,
  open,
  onClose,
}: {
  index: SearchEntry[];
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  return createPortal(<Panel index={index} onClose={onClose} />, document.body);
}

type Entry = SearchEntry & { compareAt?: number; discountPercent?: number };

function Panel({ index, onClose }: { index: Entry[]; onClose: () => void }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const openedOn = useRef(pathname);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);

  const q = query.trim();
  const all = q ? (searchProducts(index, q) as Entry[]) : [];
  const results = q ? all.slice(0, MAX_RESULTS) : index.slice(0, 4);
  const allHref = `/collections?q=${encodeURIComponent(q)}`;

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  // The header stays on screen across pages, so close the panel whenever the page changes…
  useEffect(() => {
    if (pathname !== openedOn.current) onClose();
  }, [pathname, onClose]);

  // …and on any link or button clicked outside it (Shop, Bag, Account, even the
  // page already open). The search icon is left to toggle the panel itself.
  useEffect(() => {
    const onPointer = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || rootRef.current?.contains(t) || t.closest("[data-search-toggle]")) return;
      if (t.closest("a, button, [role='button'], summary")) onClose();
    };
    document.addEventListener("pointerdown", onPointer, true);
    return () => document.removeEventListener("pointerdown", onPointer, true);
  }, [onClose]);

  const go = (href: string) => {
    onClose();
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(-1, i - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) go(results[active].href);
      else if (q) go(allHref);
    }
  };

  return (
    <div ref={rootRef} className="fixed inset-x-0 top-28 bottom-0 z-[45]">
      {/* Dim the page below the header, but keep it visible */}
      <div aria-hidden="true" className="absolute inset-0 bg-primary/20 motion-safe:animate-[dialogIn_160ms_ease-out]" onClick={onClose} />

      <div className="relative max-w-[1536px] mx-auto px-margin-mobile lg:px-margin flex justify-end">
        <div
          aria-label="Search products"
          className="w-full sm:max-w-xl mt-2 bg-surface-container-lowest rounded-2xl shadow-2xl ring-1 ring-outline-variant/30 overflow-hidden motion-safe:animate-[dialogIn_160ms_ease-out]"
          role="dialog"
        >
          {/* Input row */}
          <div className="flex items-center gap-space-sm px-space-md h-14 border-b border-outline-variant/30">
            <span className="material-symbols-outlined text-[22px] text-secondary">search</span>
            <input
              ref={inputRef}
              aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
              aria-autocomplete="list"
              aria-controls={listId}
              aria-expanded={results.length > 0}
              aria-label="Search products"
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent font-body-lg text-body-lg text-primary placeholder:text-outline focus:outline-none"
              enterKeyHint="search"
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(-1);
              }}
              onKeyDown={onInputKey}
              placeholder="Find your next pair…"
              role="combobox"
              type="search"
              value={query}
            />
            {query && (
              <button
                aria-label="Clear search"
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary hover:bg-surface-container transition-colors"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
            <kbd className="hidden sm:inline font-label-uppercase text-[10px] text-outline border border-outline-variant/60 rounded px-1.5 py-0.5">
              Esc
            </kbd>
          </div>

          <div className="max-h-[min(70vh,560px)] overflow-y-auto overscroll-contain">
            {!q && (
              <div className="px-space-md pt-space-md flex flex-wrap items-center gap-space-xs">
                <span className="font-label-uppercase text-label-uppercase text-outline uppercase tracking-wider mr-1">
                  Trending
                </span>
                {trendingSearches.map((t) => (
                  <button
                    key={t}
                    className="px-space-sm py-1 rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-on-surface font-body-sm text-body-sm transition-colors"
                    onClick={() => {
                      setQuery(t);
                      inputRef.current?.focus();
                    }}
                    type="button"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            <p aria-live="polite" className="px-space-md pt-space-md pb-space-xs font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              {q ? `${all.length} ${all.length === 1 ? "result" : "results"} for “${q}”` : "Popular picks"}
            </p>

            {results.length > 0 ? (
              <ul className="pb-space-xs" id={listId} role="listbox">
                {results.map((r, i) => (
                  <li key={r.id} aria-selected={i === active} id={`${listId}-${i}`} role="option">
                    <Link
                      className={`flex items-center gap-space-md px-space-md py-2 transition-colors ${
                        i === active ? "bg-surface-container" : "hover:bg-surface-container-low"
                      }`}
                      href={r.href}
                      onClick={onClose}
                      onMouseEnter={() => setActive(i)}
                      tabIndex={-1}
                    >
                      <span className="relative w-12 h-14 rounded-md overflow-hidden bg-surface-container shrink-0">
                        <Image alt="" className="object-cover" fill sizes="48px" src={r.image} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block font-body-md text-body-md text-primary font-medium truncate">
                          <Highlight query={q} text={r.name} />
                        </span>
                        <span className="block font-body-sm text-body-sm text-on-surface-variant truncate">{r.detail}</span>
                      </span>
                      <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                        <SalePrice category={r.category} compareAt={r.compareAt} discountPercent={r.discountPercent} price={r.price} slug={r.id} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-space-md pb-space-md">
                <p className="font-body-md text-body-md text-on-surface-variant">
                  Nothing matches “{q}”. Try “heel”, “satin” or “bridal”.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-space-sm px-space-md py-space-sm border-t border-outline-variant/30 bg-surface-container-low">
            <span className="hidden sm:inline font-body-sm text-body-sm text-outline">↑ ↓ to browse · Enter to open</span>
            {q && all.length > 0 ? (
              <Link
                className="ml-auto font-label-uppercase text-label-uppercase uppercase tracking-widest text-primary hover:text-secondary flex items-center gap-1"
                href={allHref}
                onClick={onClose}
              >
                View all {all.length} results
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            ) : (
              <Link
                className="ml-auto font-label-uppercase text-label-uppercase uppercase tracking-widest text-primary hover:text-secondary flex items-center gap-1"
                href="/collections"
                onClick={onClose}
              >
                See all products
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Bolds the parts of `text` that match a search word. */
function Highlight({ text, query }: { text: string; query: string }) {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return <>{text}</>;
  const rx = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "ig");
  return (
    <>
      {text.split(rx).map((part, i) =>
        terms.includes(part.toLowerCase()) ? (
          <mark key={i} className="bg-secondary-fixed/60 text-primary rounded-sm">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
