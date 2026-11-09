"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useBag } from "@/lib/store";
import CartDrawer from "./CartDrawer";

export const BAG_OPEN_EVENT = "elora:bag-open";

/** Slide-in mini bag shown on any page right after something is added. */
export default function CartDrawerHost() {
  const items = useBag();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(BAG_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(BAG_OPEN_EVENT, onOpen);
  }, []);

  // Navigating away (e.g. to checkout) closes it.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  return (
    <CartDrawer
      items={items}
      onClose={close}
      open={open}
      pieces={items.reduce((n, i) => n + i.quantity, 0)}
      subtotal={items.reduce((n, i) => n + i.price * i.quantity, 0)}
    />
  );
}
