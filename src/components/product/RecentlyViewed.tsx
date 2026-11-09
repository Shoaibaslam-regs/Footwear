"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useSyncExternalStore } from "react";
import SalePrice from "@/components/SalePrice";
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
    const next = [current, ...slugs].slice(0, MAX);
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    // Only re-record when the product changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  const bySlug = new Map(catalogue.map((e) => [e.id, e]));
  const items = slugs.flatMap((s) => (bySlug.has(s) ? [bySlug.get(s)!] : [])).slice(0, 4);
  if (items.length === 0) return null;

  return (
    <section className="max-w-[1536px] w-full mx-auto px-margin-mobile lg:px-margin pb-space-xl">
      <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">You Looked At</span>
      <h2 className="font-headline-md text-headline-md text-primary mb-space-md">Recently Viewed</h2>
      <ul className="grid grid-cols-2 lg:grid-cols-4 gap-space-sm sm:gap-gutter">
        {items.map((r) => (
          <li key={r.id}>
            <Link className="group block bg-surface-container-lowest rounded-lg p-1.5 sm:p-space-sm shadow-sm hover:shadow-xl transition-shadow" href={r.href}>
              <span className="relative block aspect-[3/4] rounded overflow-hidden bg-surface-container mb-space-sm">
                <Image alt={r.alt} className="object-cover transition-transform duration-700 group-hover:scale-105" fill sizes="(min-width: 1024px) 25vw, 50vw" src={r.image} />
              </span>
              <span className="block font-headline-sm text-body-lg sm:text-headline-sm text-primary truncate group-hover:text-secondary transition-colors">{r.name}</span>
              <span className="block font-label-md text-label-sm sm:text-label-md font-semibold text-primary">
                <SalePrice compareAt={r.compareAt} discountPercent={r.discountPercent} price={r.price} />
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
