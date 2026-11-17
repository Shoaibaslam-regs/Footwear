"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import { LiveCardPriceRow } from "@/components/CardPriceRow";
import type { SearchEntry } from "@/lib/search-data";

const KEY = "elora:recently-viewed";
const MAX = 8;

type Entry = SearchEntry & { compareAt?: number; discountPercent?: number };

const read = () => {
  try {
    return window.localStorage.getItem(KEY) ?? "[]";
  } catch {
    return "[]";
  }
};
const noopSubscribe = () => () => {};

/** Records this product and shows the others viewed on this device. */
export default function RecentlyViewed({ current, catalogue }: { current: string; catalogue: Entry[] }) {
  // Snapshot of what was viewed before this page ("[]" on the server).
  const raw = useSyncExternalStore(noopSubscribe, read, () => "[]");
  let slugs: string[] = [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) slugs = parsed.filter((s): s is string => typeof s === "string" && s !== current);
  } catch {}

  useEffect(() => {
    // Read the saved list fresh: during hydration `slugs` is still the server's
    // empty snapshot, and saving from it wiped the history on every visit.
    let saved: string[] = [];
    try {
      const parsed = JSON.parse(read());
      if (Array.isArray(parsed)) saved = parsed.filter((s): s is string => typeof s === "string" && s !== current);
    } catch {}
    try {
      window.localStorage.setItem(KEY, JSON.stringify([current, ...saved].slice(0, MAX)));
    } catch {}
  }, [current]);

  const bySlug = new Map(catalogue.map((e) => [e.id, e]));
  const items = slugs.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : [])).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">You Looked At</span>
      <h2 className="font-headline-md text-headline-md text-primary mb-space-md">Recently Viewed</h2>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-space-lg sm:gap-x-gutter">
        {items.map((r) => (
          <li key={r.id}>
            {/* The same card as the shop: photo, detail line, name, price line (sale tag and percent at the right). */}
            <Link className="group flex flex-col" href={r.href}>
              <span className="relative block aspect-[3/4] rounded-lg overflow-hidden bg-surface-container">
                <Image alt={r.alt} className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]" fill sizes="(min-width: 1024px) 22vw, 50vw" src={r.image} />
              </span>
              <span className="pt-2.5 sm:pt-space-sm flex flex-col gap-0.5 px-0.5">
                <span className="font-label-uppercase text-[9px] sm:text-[10px] text-outline uppercase tracking-[0.18em] truncate">{r.detail}</span>
                <span className="font-headline-sm text-[15px] sm:text-[18px] leading-snug text-primary tracking-[-0.01em] font-normal line-clamp-2">{r.name}</span>
                <LiveCardPriceRow category={r.category} compareAt={r.compareAt} discountPercent={r.discountPercent} price={r.price} slug={r.id} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
