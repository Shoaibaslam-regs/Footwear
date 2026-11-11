"use client";

import { useEffect } from "react";

/**
 * Sizes the printed page to the slip itself (roll width × slip height), so a
 * receipt printer cuts right after it, then opens the print dialog.
 * Also applies to Ctrl+P. With `auto`, prints once the logo has loaded.
 */
function fitPage(widthMm: number) {
  const slip = document.querySelector<HTMLElement>(".pos-slip");
  if (!slip) return;
  const heightMm = Math.ceil((slip.offsetHeight * 25.4) / 96) + 4;
  let tag = document.getElementById("slip-page-size");
  if (!tag) {
    tag = document.createElement("style");
    tag.id = "slip-page-size";
    // Last in the document, so it beats the page's fallback size.
    document.body.appendChild(tag);
  }
  tag.textContent = `@media print { @page { size: ${widthMm}mm ${heightMm}mm; margin: 0; } }`;
}

export default function PrintButton({ auto = false, widthMm }: { auto?: boolean; widthMm: number }) {
  useEffect(() => {
    const before = () => fitPage(widthMm);
    window.addEventListener("beforeprint", before);
    fitPage(widthMm);
    return () => window.removeEventListener("beforeprint", before);
  }, [widthMm]);

  useEffect(() => {
    if (!auto) return;
    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      fitPage(widthMm);
      window.print();
    };
    const pending = [...document.querySelectorAll<HTMLImageElement>(".pos-slip img")].filter((i) => !i.complete);
    pending.forEach((i) => i.addEventListener("load", go, { once: true }));
    const id = setTimeout(go, pending.length ? 1500 : 150);
    return () => clearTimeout(id);
  }, [auto, widthMm]);

  return (
    <button
      className="btn btn-primary"
      onClick={() => {
        fitPage(widthMm);
        window.print();
      }}
      type="button"
    >
      Print slip
    </button>
  );
}
