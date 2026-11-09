"use client";

import { useState } from "react";
import { requestStockAlert } from "@/app/(shop)/products/actions";
import { requireLogin } from "@/lib/require-login";
import { showToast } from "@/lib/toast";

/** "Sold out in your size? Notify me" for the product page. */
export default function StockAlert({ slug, soldOut }: { slug: string; soldOut: string[] }) {
  const [size, setSize] = useState(soldOut[0] ?? "");
  const [busy, setBusy] = useState(false);
  if (soldOut.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
      <span className="material-symbols-outlined text-[18px] text-secondary">notifications</span>
      <span>Sold out in your size?</span>
      <label className="sr-only" htmlFor="alert-size">
        Size to be notified about
      </label>
      <select
        className="h-8 px-2 bg-surface-container text-on-surface rounded"
        id="alert-size"
        onChange={(e) => setSize(e.target.value)}
        value={size}
      >
        {soldOut.map((s) => (
          <option key={s} value={s}>
            EU {s}
          </option>
        ))}
      </select>
      <button
        className="h-8 px-space-sm rounded-full bg-surface-container hover:bg-primary hover:text-on-primary text-primary font-label-uppercase text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50"
        disabled={busy}
        onClick={async () => {
          if (!(await requireLogin("get back-in-stock alerts"))) return;
          setBusy(true);
          const r = await requestStockAlert(slug, Number(size));
          setBusy(false);
          showToast(r.ok ?? r.error ?? "");
        }}
        type="button"
      >
        Notify me
      </button>
    </div>
  );
}
