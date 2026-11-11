"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { navLinks } from "@/lib/data";

/** Home-page sections the menu links to (`/#collection` → "collection"). */
const sectionIds = navLinks.filter((l) => l.href.startsWith("/#")).map((l) => l.href.slice(2));

/** True when `pathname` is this page or one of its sub-pages (`/account` matches `/account/orders/…`). */
export const onPath = (pathname: string, href: string) => pathname === href || pathname.startsWith(`${href}/`);

/**
 * The href of the menu link for where the visitor is: `/collections` on the shop
 * and product pages; on the home page, the section in the middle of the screen
 * (it follows scrolling). Null when no menu link matches (e.g. the top of home).
 */
export function useActiveNav(): string | null {
  const pathname = usePathname();
  const [section, setSection] = useState<string | null>(null);
  const onHome = pathname === "/";

  useEffect(() => {
    if (!onHome) return;
    const els = sectionIds.map((id) => document.getElementById(id)).filter((e): e is HTMLElement => !!e);
    if (els.length === 0) return;
    const visible = new Set<HTMLElement>();
    // A thin band across the middle of the screen: the section crossing it is "current".
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const el = e.target as HTMLElement;
          if (e.isIntersecting) visible.add(el);
          else visible.delete(el);
        }
        // Of the sections crossing the band, the one that starts lowest on the page wins:
        // that is the innermost when they nest (the Bridal banner sits inside Our Story).
        let current: HTMLElement | null = null;
        for (const el of visible) {
          if (!current || current.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) current = el;
        }
        setSection(current?.id ?? null);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [onHome]);

  if (onHome) return section ? `/#${section}` : null;
  for (const link of navLinks) {
    const prefixes: readonly string[] = "activePrefixes" in link ? (link.activePrefixes ?? []) : [];
    if (prefixes.some((p) => onPath(pathname, p))) return link.href;
  }
  return null;
}
