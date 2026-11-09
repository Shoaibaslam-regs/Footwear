"use client";

import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { ProductDetail } from "@/lib/product-data";
import PhotoViewer from "./PhotoViewer";

/**
 * Product photos: a swipeable strip (scroll-snap) with thumbnails/dots.
 * Tapping a photo opens the full-screen viewer with zoom.
 */
export default function ProductGallery({ product }: { product: ProductDetail }) {
  const views = product.gallery;
  const [active, setActive] = useState(0);
  const [viewer, setViewer] = useState<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const closeViewer = useCallback(() => setViewer(null), []);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
    setActive(i);
  };

  return (
    <div className="lg:col-span-7 flex flex-col gap-space-md">
      {/* Main stage: swipe on touch, arrows/thumbnails on desktop */}
      <div className="relative w-full aspect-[4/5] bg-surface-container-lowest overflow-hidden shadow-sm">
        <div
          ref={track}
          aria-label="Product photos"
          className="absolute inset-0 flex overflow-x-auto snap-x snap-mandatory scroll-smooth [scrollbar-width:none]"
          onScroll={(e) => {
            const el = e.currentTarget;
            const i = Math.round(el.scrollLeft / el.clientWidth);
            if (i !== active) setActive(i);
          }}
        >
          {views.map((v, i) => (
            <button
              key={`${i}-${v.image}`}
              aria-label={`Open photo ${i + 1} of ${views.length} full screen`}
              className="relative shrink-0 w-full h-full snap-center cursor-zoom-in"
              onClick={() => setViewer(i)}
              type="button"
            >
              <Image
                alt={v.alt}
                className="object-cover object-center"
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 55vw, 100vw"
                src={v.image}
              />
            </button>
          ))}
        </div>

        <div className="absolute top-space-md left-space-md flex flex-col gap-space-xs pointer-events-none">
          {product.badges.map((b) => (
            <span
              key={b.label}
              className={`px-space-sm py-1 ${b.className} font-label-uppercase text-label-uppercase uppercase tracking-wider text-[10px]`}
            >
              {b.label}
            </span>
          ))}
        </div>

        {views.length > 1 && (
          <>
            {[
              { dir: -1, icon: "chevron_left", label: "Previous photo", pos: "left-space-sm" },
              { dir: 1, icon: "chevron_right", label: "Next photo", pos: "right-space-sm" },
            ].map((a) => (
              <button
                key={a.icon}
                aria-label={a.label}
                className={`hidden lg:flex absolute top-1/2 -translate-y-1/2 ${a.pos} w-10 h-10 rounded-full bg-surface/85 backdrop-blur-md items-center justify-center text-primary shadow-md hover:bg-surface disabled:opacity-0 transition-opacity`}
                disabled={a.dir < 0 ? active === 0 : active === views.length - 1}
                onClick={() => goTo(active + a.dir)}
                type="button"
              >
                <span className="material-symbols-outlined">{a.icon}</span>
              </button>
            ))}
            {/* Dots (phones) */}
            <div className="lg:hidden absolute bottom-space-sm inset-x-0 flex justify-center gap-1.5 pointer-events-none">
              {views.map((v, i) => (
                <span
                  key={`dot-${i}`}
                  className={`h-1.5 rounded-full transition-all ${i === active ? "w-5 bg-primary" : "w-1.5 bg-primary/30"}`}
                />
              ))}
            </div>
          </>
        )}

        <div className="absolute bottom-space-md right-space-md hidden sm:flex items-center gap-space-xs px-space-sm py-1.5 bg-surface/80 backdrop-blur-md font-label-uppercase text-label-uppercase text-on-surface text-[10px] uppercase tracking-wider pointer-events-none">
          <span className="material-symbols-outlined text-[14px]">zoom_in</span>
          <span>Tap to zoom</span>
        </div>
      </div>

      {/* Thumbnails (hidden for a single photo) */}
      {views.length > 1 && (
        <div className={`hidden sm:grid gap-space-sm ${views.length <= 4 ? "grid-cols-4" : views.length === 5 ? "grid-cols-5" : "grid-cols-6"}`}>
          {views.map((g, i) => (
            <button
              key={`${i}-${g.image}`}
              aria-label={g.ariaLabel}
              aria-pressed={i === active}
              className={`relative aspect-[3/4] bg-surface-container-lowest overflow-hidden transition-all duration-300 ${
                i === active ? "ring-2 ring-primary" : "opacity-70 hover:opacity-100"
              }`}
              onClick={() => goTo(i)}
              type="button"
            >
              <Image alt="" className="w-full h-full object-cover" fill sizes="(min-width: 1024px) 10vw, 25vw" src={g.thumb} />
              <span
                className={`absolute bottom-1 left-1 text-[9px] font-label-uppercase px-1 py-0.5 uppercase tracking-wider ${
                  i === 0 ? "text-on-primary bg-primary/70" : "text-on-surface bg-surface/80 backdrop-blur-sm"
                }`}
              >
                {g.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Editorial Quote Banner */}
      <div className="mt-space-lg p-space-lg bg-surface-container-low flex flex-col md:flex-row items-start md:items-center justify-between gap-space-md">
        <div className="space-y-1">
          <p className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.16em]">Florentine Masterwork</p>
          <p className="font-headline-sm text-headline-sm text-primary font-normal italic">{product.quote}</p>
        </div>
        <div className="shrink-0 flex items-center gap-space-sm font-label-uppercase text-label-uppercase text-on-surface-variant text-[11px] uppercase tracking-wider">
          <span className="material-symbols-outlined text-[20px] text-secondary">verified</span>
          <span>{product.certificate}</span>
        </div>
      </div>

      <PhotoViewer
        photos={views.map((v) => ({ src: v.image, alt: v.alt }))}
        start={viewer}
        onClose={closeViewer}
        onIndex={(i) => goTo(i)}
      />
    </div>
  );
}
