"use client";

import { useEffect } from "react";

/**
 * While a fixed bottom bar is shown on phones/tablets (below `lg`), set
 * `--bottom-bar` on <html> so the WhatsApp button, toasts and page padding
 * sit above it.
 */
export function useBottomBar(height: number) {
  useEffect(() => {
    const root = document.documentElement;
    const mq = matchMedia("(max-width: 1023px)");
    const apply = () => root.style.setProperty("--bottom-bar", mq.matches ? `${height}px` : "0px");
    apply();
    mq.addEventListener("change", apply);
    return () => {
      mq.removeEventListener("change", apply);
      root.style.removeProperty("--bottom-bar");
    };
  }, [height]);
}
