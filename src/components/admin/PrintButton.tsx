"use client";

import { useEffect } from "react";

export type Paper = "A4" | "A5";

/**
 * Opens the print dialog for the order slip (the page's own CSS sets the
 * paper size). With `auto`, prints once the slip's photos have loaded.
 */
export default function PrintButton({ auto = false }: { auto?: boolean }) {
  useEffect(() => {
    if (!auto) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      window.print();
    };
    const pending = [...document.querySelectorAll<HTMLImageElement>(".order-slip img")].filter((i) => !i.complete);
    let left = pending.length;
    pending.forEach((i) => {
      const one = () => --left <= 0 && go();
      i.addEventListener("load", one, { once: true });
      i.addEventListener("error", one, { once: true });
    });
    const id = setTimeout(go, pending.length ? 3000 : 150);
    return () => clearTimeout(id);
  }, [auto]);

  return (
    <button className="btn btn-primary" onClick={() => window.print()} type="button">
      Print slip
    </button>
  );
}
