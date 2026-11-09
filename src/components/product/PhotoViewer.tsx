"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { useDialog } from "@/components/header/useDialog";

const ZOOM = 2.5;

export type ViewerPhoto = { src: string; alt: string };

/**
 * Full-screen photo viewer: swipe or ←/→ between photos, tap/click to zoom,
 * drag to pan while zoomed, Esc to close. Reused by product galleries and reviews.
 */
export default function PhotoViewer({
  photos,
  start,
  onClose,
  onIndex,
}: {
  photos: ViewerPhoto[];
  /** Index to open at; null = closed. */
  start: number | null;
  onClose: () => void;
  /** Reports the photo shown when the viewer closes (to sync the page gallery). */
  onIndex?: (i: number) => void;
}) {
  if (start === null) return null;
  return createPortal(<Viewer onClose={onClose} onIndex={onIndex} photos={photos} start={start} />, document.body);
}

function Viewer({
  photos,
  start,
  onClose,
  onIndex,
}: {
  photos: ViewerPhoto[];
  start: number;
  onClose: () => void;
  onIndex?: (i: number) => void;
}) {
  const [index, setIndex] = useState(start);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);
  const track = useRef<HTMLDivElement>(null);
  const close = () => {
    onIndex?.(index);
    onClose();
  };
  const panel = useDialog<HTMLDivElement>(true, close);

  // Open at the requested photo.
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollLeft = start * el.clientWidth;
  }, [start]);

  const go = (i: number) => {
    const n = Math.max(0, Math.min(photos.length - 1, i));
    setZoom(null);
    setIndex(n);
    const el = track.current;
    if (el) el.scrollTo({ left: n * el.clientWidth, behavior: "smooth" });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(index + 1);
      if (e.key === "ArrowLeft") go(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Zoom centred on the tap point (as % of the image box).
  const toggleZoom = (e: React.MouseEvent<HTMLDivElement>) => {
    if (drag.current?.moved) return;
    if (zoom) return setZoom(null);
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };
  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!zoom) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: zoom.x, y: zoom.y, moved: false };
    setPanning(true);
  };
  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || !zoom) return;
    const r = e.currentTarget.getBoundingClientRect();
    const dx = ((e.clientX - d.px) / r.width) * 100;
    const dy = ((e.clientY - d.py) / r.height) * 100;
    if (Math.abs(dx) + Math.abs(dy) > 1) d.moved = true;
    // Dragging right reveals more of the left side, so the origin moves the other way.
    setZoom({ x: Math.max(0, Math.min(100, d.x - dx / (ZOOM - 1))), y: Math.max(0, Math.min(100, d.y - dy / (ZOOM - 1))) });
  };
  const onUp = () => {
    setPanning(false);
    // Keep `moved` until the click handler has seen it.
    setTimeout(() => (drag.current = null), 0);
  };

  return (
    <div ref={panel} aria-label="Photo viewer" aria-modal="true" className="fixed inset-0 z-[75] bg-primary/95 flex flex-col" role="dialog">
      <div className="flex items-center justify-between px-space-md h-14 text-surface-container-lowest">
        <span className="font-label-uppercase text-label-uppercase uppercase tracking-widest">
          {index + 1} / {photos.length}
        </span>
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline font-body-sm text-body-sm text-surface-container-lowest/70">
            {zoom ? "Drag to look around · tap to zoom out" : "Tap to zoom"}
          </span>
          <button aria-label="Close photo viewer" className="w-10 h-10 rounded-full hover:bg-surface-container-lowest/10 flex items-center justify-center" data-autofocus onClick={close} type="button">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>

      <div
        ref={track}
        className={`flex-1 flex snap-x snap-mandatory [scrollbar-width:none] ${zoom ? "overflow-hidden" : "overflow-x-auto"}`}
        onScroll={(e) => {
          const el = e.currentTarget;
          const i = Math.round(el.scrollLeft / el.clientWidth);
          if (i !== index) {
            setIndex(i);
            setZoom(null);
          }
        }}
      >
        {photos.map((p, i) => (
          <div key={`${i}-${p.src}`} className="relative shrink-0 w-full h-full snap-center overflow-hidden">
            <div
              className={`absolute inset-0 select-none touch-none ${i === index && zoom ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
              onClick={toggleZoom}
              onPointerCancel={onUp}
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              style={
                i === index && zoom
                  ? { transform: `scale(${ZOOM})`, transformOrigin: `${zoom.x}% ${zoom.y}%`, transition: panning ? "none" : "transform 200ms ease-out" }
                  : { transform: "scale(1)", transition: "transform 200ms ease-out" }
              }
            >
              <Image alt={p.alt} className="object-contain pointer-events-none" draggable={false} fill sizes="100vw" src={p.src} />
            </div>
          </div>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="flex items-center justify-center gap-space-md py-space-sm">
          <button aria-label="Previous photo" className="w-11 h-11 rounded-full bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-surface-container-lowest flex items-center justify-center disabled:opacity-30" disabled={index === 0} onClick={() => go(index - 1)} type="button">
            <span className="material-symbols-outlined">chevron_left</span>
          </button>
          <button aria-label="Next photo" className="w-11 h-11 rounded-full bg-surface-container-lowest/10 hover:bg-surface-container-lowest/20 text-surface-container-lowest flex items-center justify-center disabled:opacity-30" disabled={index === photos.length - 1} onClick={() => go(index + 1)} type="button">
            <span className="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      )}
    </div>
  );
}
