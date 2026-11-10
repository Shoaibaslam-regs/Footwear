"use client";

import { useEffect, useState } from "react";
import type { Notice } from "@/lib/notice";

const SHOW_MS = 5000;

/**
 * Coupon notification: slides down from the top in the site colours
 * (espresso card, champagne-gold accent, the scratch card's gold edge),
 * with a timer line and a close button. Listens for showNotice() events.
 */
export default function TopNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const [visible, setVisible] = useState(false);
  const [run, setRun] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onNotice = (e: Event) => {
      setNotice((e as CustomEvent<Notice>).detail);
      setVisible(true);
      setRun((n) => n + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), SHOW_MS);
    };
    window.addEventListener("rose:notice", onNotice);
    return () => {
      window.removeEventListener("rose:notice", onNotice);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      role="status"
      className={`fixed z-[70] inset-x-3 top-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] pt-[env(safe-area-inset-top)] transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
        visible ? "opacity-100 translate-y-0 duration-[650ms]" : "opacity-0 -translate-y-[130%] duration-300 pointer-events-none"
      }`}
    >
      {notice && (
        <div className="relative overflow-hidden rounded-2xl bg-primary-container text-on-primary shadow-[0_18px_50px_rgba(0,0,0,0.35)] border border-secondary-fixed/25">
          {/* Gold foil edge, like the scratch card */}
          <span aria-hidden="true" className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#b8860b] via-[#f5e4b3] to-[#aa771c]" />
          <div className="flex items-start gap-space-sm p-space-md pt-[calc(1rem+2px)]">
            <span className="shrink-0 w-11 h-11 rounded-full bg-gradient-to-br from-[#dfbe76] via-[#d4af37] to-[#aa771c] text-primary flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined icon-filled text-[22px]">{notice.icon ?? "redeem"}</span>
            </span>
            <div className="min-w-0 flex-1">
              <span className="block font-label-uppercase text-[10px] tracking-[0.2em] uppercase text-secondary-fixed">Ŕose Atelier</span>
              <p className="font-headline-sm text-headline-sm text-surface-container-lowest leading-tight">{notice.title}</p>
              {notice.message && <p className="mt-0.5 font-body-sm text-body-sm text-primary-fixed">{notice.message}</p>}
            </div>
            <button
              aria-label="Close notification"
              className="shrink-0 -mr-1 -mt-1 w-8 h-8 rounded-full text-primary-fixed hover:bg-surface-container-lowest/10 flex items-center justify-center transition-colors"
              onClick={() => setVisible(false)}
              type="button"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
          {visible && (
            <span
              key={run}
              aria-hidden="true"
              className="notice-timer absolute left-0 bottom-0 h-0.5 w-full bg-secondary-fixed/70"
              style={{ "--notice-ms": `${SHOW_MS}ms` } as React.CSSProperties}
            />
          )}
        </div>
      )}
    </div>
  );
}
