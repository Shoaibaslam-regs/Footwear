"use client";

import { useState } from "react";

/**
 * One tap to print an order slip, without leaving the page: the slip loads in
 * a hidden frame with `?print=1`, which opens the print dialog itself once its
 * photos have loaded (see PrintButton). The frame is removed after printing.
 */
export default function PrintSlipButton({
  orderId,
  className = "btn",
  children = "Print slip",
  onPrint,
}: {
  orderId: string;
  className?: string;
  children?: React.ReactNode;
  onPrint?: () => void;
}) {
  const [busy, setBusy] = useState(false);

  const print = () => {
    if (busy) return;
    setBusy(true);
    onPrint?.();
    document.getElementById("slip-print-frame")?.remove();
    const frame = document.createElement("iframe");
    frame.id = "slip-print-frame";
    frame.title = "Order slip";
    frame.setAttribute("aria-hidden", "true");
    // Off screen but full size, so the slip lays out exactly as on its own page.
    frame.style.cssText = "position:fixed;left:-10000px;top:0;width:900px;height:1300px;border:0;";
    const done = () => {
      setBusy(false);
      setTimeout(() => frame.remove(), 1000);
    };
    frame.addEventListener("load", () => {
      frame.contentWindow?.addEventListener("afterprint", done, { once: true });
      // If the dialog never reports back, free the button anyway.
      setTimeout(() => setBusy(false), 8000);
    });
    frame.src = `/admin/orders/${orderId}/slip?print=1`;
    document.body.appendChild(frame);
  };

  return (
    <button className={className} disabled={busy} onClick={print} type="button">
      {busy ? "Preparing…" : children}
    </button>
  );
}
