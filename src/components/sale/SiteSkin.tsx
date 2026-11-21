"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { liveSiteTheme } from "@/lib/sale-events";
import { useSaleClock } from "./SaleProvider";

/** Pages that stay plain, so paying feels calm and clear (the bag keeps the theme, owner 2026-11-21). */
const PLAIN = ["/checkout"];

/**
 * While a sale with "Dress the whole shop in this theme" is live (lib/sale-events.ts
 * liveSiteTheme), sets `<html data-skin="ice">`; globals.css does the rest
 * (owner, 2026-11-21). It follows the sale clock, so the look comes and goes
 * at the sale's exact start and end. Renders nothing. Must sit inside <Suspense>
 * (usePathname).
 */
export default function SiteSkin() {
  const { events, now } = useSaleClock();
  const path = usePathname();
  const theme = now === null || PLAIN.some((p) => path === p || path.startsWith(`${p}/`)) ? null : liveSiteTheme(events, now);
  useEffect(() => {
    const root = document.documentElement;
    if (theme) root.dataset.skin = theme;
    else delete root.dataset.skin;
    return () => {
      delete root.dataset.skin;
    };
  }, [theme]);
  return null;
}
