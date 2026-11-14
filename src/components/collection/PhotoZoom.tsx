"use client";

import Image from "next/image";
import { useRef, useState, type PointerEvent } from "react";

const ZOOM = 2.5;
/** A touch that moves less than this is a tap (zoom), not a swipe or a pan. */
const TAP_PX = 8;
/** A horizontal swipe this long changes the photo (when not zoomed). */
const SWIPE_PX = 45;
/** Hover zoom only where a mouse really hovers (not phones or touch laptops in touch mode). */
const canHover = () => typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;

type Photo = { url: string; alt: string };

/**
 * Quick View photos with zoom.
 * Mouse: hover zooms in under the cursor. Touch: tap zooms in at that point,
 * drag pans, tap again zooms out; swipe left/right changes the photo.
 * The zoom button does the same for keyboards.
 */
export default function PhotoZoom({ photos, name }: { photos: Photo[]; name: string }) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const box = useRef<HTMLDivElement>(null);
  const touch = useRef<{ x: number; y: number; ox: number; oy: number; moved: number } | null>(null);
  const photo = photos[index] ?? photos[0];
  const many = photos.length > 1;

  const at = (e: PointerEvent) => {
    const r = box.current!.getBoundingClientRect();
    return { x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)), y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)) };
  };
  const go = (to: number) => {
    setZoomed(false);
    setOrigin({ x: 50, y: 50 });
    setIndex((to + photos.length) % photos.length);
  };

  return (
    <div className="flex flex-col gap-2 sm:gap-3">
      <div
        aria-label={`${name}: photo ${index + 1} of ${photos.length}${zoomed ? ", zoomed in" : ""}`}
        className={`relative w-full aspect-square max-h-[46dvh] sm:max-h-[460px] mx-auto rounded-xl overflow-hidden bg-surface-container-lowest ring-1 ring-outline-variant/30 select-none ${
          zoomed ? "touch-none cursor-zoom-out" : "touch-pan-y cursor-zoom-in"
        }`}
        onPointerCancel={() => (touch.current = null)}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse") return;
          touch.current = { x: e.clientX, y: e.clientY, ox: origin.x, oy: origin.y, moved: 0 };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerEnter={(e) => {
          if (e.pointerType !== "mouse" || !canHover()) return;
          setOrigin(at(e));
          setZoomed(true);
        }}
        onPointerLeave={(e) => {
          if (e.pointerType === "mouse") setZoomed(false);
        }}
        onPointerMove={(e) => {
          if (e.pointerType === "mouse") {
            if (zoomed && canHover()) setOrigin(at(e));
            return;
          }
          const t = touch.current;
          if (!t) return;
          const dx = e.clientX - t.x;
          const dy = e.clientY - t.y;
          t.moved = Math.max(t.moved, Math.hypot(dx, dy));
          if (!zoomed) return;
          // Drag the photo with the finger: moving the scale origin by d moves
          // the picture by d × (ZOOM − 1) the other way.
          const r = box.current!.getBoundingClientRect();
          setOrigin({
            x: Math.min(100, Math.max(0, t.ox - ((dx / r.width) * 100) / (ZOOM - 1))),
            y: Math.min(100, Math.max(0, t.oy - ((dy / r.height) * 100) / (ZOOM - 1))),
          });
        }}
        onPointerUp={(e) => {
          const t = touch.current;
          touch.current = null;
          if (!t) return;
          const dx = e.clientX - t.x;
          if (t.moved < TAP_PX) {
            if (zoomed) setZoomed(false);
            else {
              setOrigin(at(e));
              setZoomed(true);
            }
          } else if (!zoomed && many && Math.abs(dx) > SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - t.y)) {
            go(index + (dx < 0 ? 1 : -1));
          }
        }}
        ref={box}
        role="group"
      >
        <div
          className="absolute inset-0 transition-transform duration-200 ease-out motion-reduce:transition-none will-change-transform"
          style={{ transform: zoomed ? `scale(${ZOOM})` : "none", transformOrigin: `${origin.x}% ${origin.y}%` }}
        >
          <Image
            alt={photo.alt}
            className="object-cover pointer-events-none"
            draggable={false}
            fill
            key={photo.url}
            priority
            sizes="(min-width: 1024px) 560px, 92vw"
            src={photo.url}
          />
        </div>

        {/* Zoom toggle (keyboard and a visible hint) */}
        <button
          aria-label={zoomed ? "Zoom out" : "Zoom in"}
          aria-pressed={zoomed}
          className="absolute right-2.5 bottom-2.5 w-9 h-9 rounded-full bg-surface/90 backdrop-blur-sm text-primary shadow-md ring-1 ring-outline-variant/40 flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors"
          onClick={() => {
            setOrigin({ x: 50, y: 50 });
            setZoomed((z) => !z);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
          type="button"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[20px]">
            {zoomed ? "zoom_out" : "zoom_in"}
          </span>
        </button>

        {!zoomed && (
          <span className="absolute left-2.5 bottom-2.5 pointer-events-none px-2.5 py-1 rounded-full bg-surface/85 backdrop-blur-sm text-[10px] font-label-uppercase uppercase tracking-wider text-on-surface-variant shadow-sm">
            <span className="sm:hidden">Tap to zoom</span>
            <span className="hidden sm:inline">Hover to zoom</span>
          </span>
        )}

        {many && (
          <>
            <span className="absolute top-2.5 left-2.5 pointer-events-none px-2 py-0.5 rounded-full bg-primary/75 text-on-primary text-[10px] font-label-uppercase tracking-wider tabular-nums">
              {index + 1} / {photos.length}
            </span>
            {([-1, 1] as const).map((d) => (
                <button
                  aria-label={d < 0 ? "Previous photo" : "Next photo"}
                  className={`absolute top-1/2 -translate-y-1/2 ${d < 0 ? "left-2" : "right-2"} w-9 h-9 rounded-full bg-surface/85 backdrop-blur-sm text-primary shadow-md flex items-center justify-center hover:bg-primary hover:text-on-primary transition-colors`}
                  key={d}
                  onClick={() => go(index + d)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                  type="button"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[22px]">
                    {d < 0 ? "chevron_left" : "chevron_right"}
                  </span>
                </button>
              ))}
          </>
        )}
      </div>

      {many && (
        <div aria-label="Photos" className="flex justify-center gap-1.5 sm:gap-2 overflow-x-auto [scrollbar-width:none] px-1" role="group">
          {photos.map((ph, i) => (
            <button
              aria-current={i === index || undefined}
              aria-label={`Photo ${i + 1}`}
              className={`relative w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-lg overflow-hidden transition-all ${
                i === index ? "ring-2 ring-primary" : "ring-1 ring-outline-variant/40 opacity-70 hover:opacity-100"
              }`}
              key={ph.url + i}
              onClick={() => go(i)}
              type="button"
            >
              <Image alt="" className="object-cover" fill sizes="56px" src={ph.url} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
