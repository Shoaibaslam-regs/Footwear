"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { refreshCart } from "@/lib/store";

/**
 * Reloads the account bag/wishlist after navigations, which is when a
 * sign-in, sign-out or checkout has just happened.
 */
export default function CartSync() {
  const pathname = usePathname();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false; // the store loads itself on first use
      return;
    }
    void refreshCart();
  }, [pathname]);
  return null;
}
