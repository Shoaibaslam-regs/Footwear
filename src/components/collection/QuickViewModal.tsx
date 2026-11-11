"use client";

import { requireLogin } from "@/lib/require-login";
import Image from "next/image";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";
import SalePrice from "@/components/SalePrice";
import SizeGuideLink from "@/components/SizeGuideLink";
import type { CatalogProduct } from "@/lib/collection-data";
import { showToast } from "@/lib/toast";
import { productId } from "@/lib/product-id";
import {
  addToBag as addItemToBag,
  openBag,
  toggleWishlist as toggleSaved,
  useInBag,
  useIsWishlisted,
} from "@/lib/store";

export type QuickViewState = {
  product: CatalogProduct;
  /** Size preselected when opened from a quick-add size button. */
  size?: number;
};

const SIZES = [36, 37, 38, 39, 40];
const DEFAULT_SIZE = 38;
/** Degrees of spin per pixel dragged. */
const DRAG_RATIO = 0.8;
const ANIM_MS = 250;

const PRESETS = [
  { label: "Side (0°)", angle: 0 },
  { label: "Front (90°)", angle: 90 },
  { label: "Back (180°)", angle: 180 },
  { label: "Top (270°)", angle: 270 },
];

const norm = (deg: number) => ((deg % 360) + 360) % 360;

function perspectiveLabel(deg: number) {
  const d = norm(deg);
  if (d >= 335 || d < 25) return "Side (0°)";
  if (d < 70) return "Front Side (45°)";
  if (d < 115) return "Front (90°)";
  if (d < 160) return "Back Side (135°)";
  if (d < 205) return "Back (180°)";
  if (d < 250) return "Inner Side (225°)";
  if (d < 295) return "Top (270°)";
  return "Back Corner (315°)";
}

/** Simulated turntable transform for an angle. */
function turntable(angle: number) {
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    stage: `scale(${0.95 + 0.05 * Math.abs(cos)}) scaleX(${cos >= 0 ? 1 : -1}) skewY(${sin * 4}deg)`,
  };
}

/**
 * Quick-view modal with the 360° Spin Studio. Stays mounted briefly after
 * closing so the fade/scale-out transition can play.
 */
export default function QuickViewModal({
  state,
  onClose,
}: {
  state: QuickViewState | null;
  onClose: () => void;
}) {
  // Keep the last opened product mounted while the exit transition plays.
  const [rendered, setRendered] = useState<QuickViewState | null>(state);
  const [entered, setEntered] = useState(false);
  if (state && state !== rendered) setRendered(state);
  const visible = state !== null && entered;

  useEffect(() => {
    if (state) {
      // Next frame, so the enter transition runs from the hidden styles.
      const id = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(id);
    }
    const id = setTimeout(() => {
      setRendered(null);
      setEntered(false);
    }, ANIM_MS);
    return () => clearTimeout(id);
  }, [state]);

  if (!rendered) return null;
  return (
    <QuickViewStudio
      key={`${rendered.product.name}-${rendered.size ?? ""}`}
      state={rendered}
      visible={visible}
      onClose={onClose}
    />
  );
}

function QuickViewStudio({
  state: { product: p, size: initialSize },
  visible,
  onClose,
}: {
  state: QuickViewState;
  visible: boolean;
  onClose: () => void;
}) {
  const [studio, setStudio] = useState(true);
  const [angle, setAngle] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [hintHidden, setHintHidden] = useState(false);
  const [size, setSize] = useState(
    initialSize && SIZES.includes(initialSize) ? initialSize : DEFAULT_SIZE,
  );
  const pid = productId(p.name, p.href);
  const saved = useIsWishlisted(pid);
  const [popping, setPopping] = useState(false);
  const dragStart = useRef({ x: 0, angle: 0 });
  const closeRef = useRef<HTMLButtonElement>(null);

  // Focus, Escape-to-close, scroll lock, focus restore.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    // Let a popup opened on top (size guide, confirmation) handle Escape first.
    const onKey = (e: KeyboardEvent) =>
      e.key === "Escape" &&
      !document.getElementById("size-guide-title") &&
      !document.getElementById("dialog-title") &&
      onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [onClose]);

  // Continuous auto-spin (1° every 40ms), paused while dragging or in Still View.
  useEffect(() => {
    if (!autoRotate || !studio || dragging || !visible) return;
    const id = setInterval(() => setAngle((a) => norm(a + 1)), 40);
    return () => clearInterval(id);
  }, [autoRotate, studio, dragging, visible]);

  useEffect(() => {
    if (!popping) return;
    const id = setTimeout(() => setPopping(false), 450);
    return () => clearTimeout(id);
  }, [popping]);

  const goTo = useCallback((deg: number) => {
    setAutoRotate(false);
    setAngle(norm(deg));
  }, []);

  const toggleAutoRotate = () => {
    showToast(autoRotate ? "Rotation stopped" : "Rotation started");
    setAutoRotate(!autoRotate);
  };

  const setMode = (toStudio: boolean) => {
    if (toStudio === studio) return;
    setStudio(toStudio);
    if (toStudio) {
      setHintHidden(false);
      setAutoRotate(true);
      showToast("360° view");
    } else {
      setAutoRotate(false);
      showToast("Photo view");
    }
  };

  // Drag-to-spin (mouse, pen and touch via pointer events).
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!studio || (e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { x: e.clientX, angle };
    setDragging(true);
    setAutoRotate(false);
    setHintHidden(true);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    setAngle(
      norm(
        dragStart.current.angle +
          (e.clientX - dragStart.current.x) * DRAG_RATIO,
      ),
    );
  };
  const endDrag = () => setDragging(false);

  const selectSize = (s: number) => {
    setSize(s);
    showToast(`Size EU ${s} selected`);
  };

  const inBag = useInBag(pid, `EU ${size}`);
  const addToBag = async () => {
    if (inBag) {
      onClose();
      openBag();
      return;
    }
    if (!(await requireLogin("add items to your bag"))) return;
    addItemToBag({
      id: pid,
      name: p.name,
      price: p.price,
      image: p.image,
      alt: p.alt,
      size: `EU ${size}`,
      href: p.href,
      material: p.material,
    });
    onClose();
  };

  const toggleWishlist = async () => {
    if (!(await requireLogin("save items to your wishlist"))) return;
    const added = toggleSaved({
      id: pid,
      name: p.name,
      price: p.price,
      image: p.image,
      alt: p.alt,
      href: p.href,
      detail: p.material,
    });
    setPopping(true);
    showToast(added ? "Added to Wishlist" : "Removed from Wishlist");
  };

  const t = turntable(angle);
  const modeBtn = (active: boolean) =>
    `px-3 py-1 rounded-full font-semibold transition-all flex items-center gap-1.5 whitespace-nowrap ${
      active
        ? "bg-primary text-on-primary"
        : "text-on-surface-variant hover:text-primary"
    }`;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 flex items-center justify-center p-3 sm:p-5 lg:p-8 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-primary/75 backdrop-blur-md transition-opacity duration-300 cursor-pointer"
        onClick={onClose}
      />

      {/* Modal Frame */}
      <div
        aria-labelledby="quick-view-title"
        aria-modal="true"
        role="dialog"
        className={`relative w-full max-w-5xl bg-surface-container-lowest rounded-2xl shadow-2xl overflow-hidden border border-outline-variant/30 transform transition-all duration-300 max-h-[92vh] flex flex-col z-10 ${
          visible ? "scale-100" : "scale-95"
        }`}
      >
        <button
          ref={closeRef}
          aria-label="Close Quick View"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-surface-container/80 hover:bg-primary hover:text-on-primary flex items-center justify-center text-on-surface transition-all duration-200 z-30 cursor-pointer shadow-sm"
          onClick={onClose}
          type="button"
        >
          <span className="material-symbols-outlined text-[20px]">close</span>
        </button>

        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0">
          {/* LEFT STAGE: 360° Turntable & Still View */}
          <div className="lg:col-span-7 bg-surface-container-low p-4 sm:p-6 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-outline-variant/20 relative select-none">
            {/* Top bar: mode switch & angle readout */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3 z-20 pr-10 lg:pr-0">
              <div
                aria-label="View mode"
                className="inline-flex p-1 bg-surface-container rounded-full shadow-inner border border-outline-variant/30 text-xs font-label-uppercase"
                role="group"
              >
                <button
                  aria-pressed={studio}
                  className={modeBtn(studio)}
                  onClick={() => setMode(true)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    360
                  </span>
                  <span>360° View</span>
                </button>
                <button
                  aria-pressed={!studio}
                  className={modeBtn(!studio)}
                  onClick={() => setMode(false)}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    photo_camera
                  </span>
                  <span>Photo</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur-md rounded-full border border-outline-variant/30 flex items-center gap-1 text-[11px] font-label-uppercase uppercase text-primary font-medium whitespace-nowrap">
                  <span className="text-secondary font-semibold">
                    {studio ? perspectiveLabel(angle) : "Photo"}
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="font-mono text-outline">
                    {Math.round(angle)}°
                  </span>
                </div>
                <button
                  aria-label={
                    autoRotate ? "Stop rotating" : "Start rotating"
                  }
                  aria-pressed={autoRotate}
                  className="w-8 h-8 rounded-full bg-surface-container-lowest hover:bg-secondary-fixed text-primary flex items-center justify-center transition-all border border-outline-variant/30 cursor-pointer disabled:opacity-40"
                  disabled={!studio}
                  onClick={toggleAutoRotate}
                  title="Rotate automatically"
                  type="button"
                >
                  <span className="material-symbols-outlined text-[17px]">
                    {autoRotate && studio ? "pause" : "play_arrow"}
                  </span>
                </button>
              </div>
            </div>

            {/* Turntable viewport */}
            <div
              className={`relative w-full aspect-[4/3] sm:aspect-[1/1] max-h-[460px] rounded-xl bg-linear-to-b/srgb from-surface-container-lowest to-surface-container-low border border-outline-variant/30 flex items-center justify-center overflow-hidden shadow-inner group touch-pan-y ${
                studio ? (dragging ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
            >
              {/* Ambient pedestal & shadows */}
              <div className="absolute inset-x-12 bottom-6 h-12 bg-black/15 blur-xl rounded-full transform scale-y-50 pointer-events-none" />
              <div className="absolute inset-x-20 bottom-10 h-6 bg-secondary/15 blur-md rounded-full pointer-events-none" />

              <div
                className="relative w-full h-full flex items-center justify-center transition-transform duration-75 will-change-transform"
                style={{ transform: studio ? t.stage : "none" }}
              >
                <div className="relative w-[85%] h-[85%] pointer-events-none">
                  <Image
                    alt={p.alt}
                    className="object-contain drop-shadow-2xl transition-all duration-100 ease-out select-none"
                    draggable={false}
                    src={p.image}
                    fill
                    sizes="(min-width: 1024px) 520px, 90vw"
                  />
                </div>

              </div>

              {/* Drag hint */}
              <div
                className={`absolute bottom-3 left-1/2 -translate-x-1/2 bg-surface/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-label-uppercase uppercase tracking-wider text-on-surface-variant border border-outline-variant/40 flex items-center gap-1.5 shadow-sm transition-opacity pointer-events-none whitespace-nowrap ${
                  studio && !hintHidden ? "" : "opacity-0"
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-secondary">
                  touch_app
                </span>
                <span>Drag left or right to turn the shoe</span>
              </div>
            </div>

            {studio ? (
              /* 360 scrub control bar */
              <div className="mt-4 pt-3 border-t border-outline-variant/20 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-y-1 text-[11px] font-label-uppercase uppercase text-outline">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">
                      rotate_right
                    </span>{" "}
                    Turn the shoe
                  </span>
                  <div className="flex items-center gap-3">
                    {PRESETS.map((pr) => (
                      <button
                        key={pr.angle}
                        className="hover:text-primary transition-colors cursor-pointer text-[10px]"
                        onClick={() => goTo(pr.angle)}
                        type="button"
                      >
                        {pr.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="relative flex items-center">
                  <input
                    aria-label="Shoe angle"
                    aria-valuetext={`${Math.round(angle)} degrees, ${perspectiveLabel(angle)}`}
                    className="w-full accent-primary cursor-pointer h-1.5 bg-surface-container rounded-lg"
                    max={360}
                    min={0}
                    onChange={(e) => goTo(Number(e.target.value))}
                    step={1}
                    type="range"
                    value={Math.round(angle)}
                  />
                </div>
              </div>
            ) : (
              /* Still view thumbnails */
              <div className="mt-3 pt-3 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="relative w-12 h-12 rounded border-2 border-primary overflow-hidden">
                    <Image
                      alt=""
                      className="object-cover"
                      src={p.image}
                      fill
                      sizes="48px"
                    />
                  </span>
                  <span className="text-[11px] font-label-uppercase uppercase text-outline">
                    High-Quality Photo
                  </span>
                </div>
                <span className="text-xs text-secondary font-label-uppercase">
                  Made in Karachi
                </span>
              </div>
            )}
          </div>

          {/* RIGHT STAGE: details & purchasing */}
          <div className="lg:col-span-5 p-6 md:p-8 flex flex-col justify-between space-y-5 bg-surface-container-lowest">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-outline text-[11px] font-label-uppercase uppercase tracking-wider mb-1 lg:pr-10">
                  <span>{p.spec}</span>
                  <span className="text-secondary font-medium">
                    Perfect Fit Promise
                  </span>
                </div>
                <h2
                  id="quick-view-title"
                  className="font-headline-md text-headline-md text-primary tracking-tight font-normal"
                >
                  {p.href ? (
                    <Link
                      className="group/name hover:text-secondary focus-visible:text-secondary transition-colors"
                      href={p.href}
                      title="View full details"
                    >
                      {p.name}
                      <span className="sr-only">, view full details</span>
                      <span
                        aria-hidden="true"
                        className="material-symbols-outlined inline-block align-middle ml-1 text-[0.85em] text-secondary transition-transform duration-200 group-hover/name:translate-x-0.5 group-hover/name:-translate-y-0.5 motion-reduce:transition-none"
                      >
                        arrow_outward
                      </span>
                    </Link>
                  ) : (
                    p.name
                  )}
                </h2>
                <p className="font-body-sm text-xs text-on-surface-variant mt-1">
                  {p.material}
                </p>
              </div>

              <div className="flex flex-wrap items-baseline gap-2 pt-1 border-b border-outline-variant/20 pb-3">
                <span className="font-body-lg text-2xl font-medium text-primary">
                  <SalePrice price={p.price} compareAt={p.compareAt} discountPercent={p.discountPercent} />
                </span>
                <span className="font-label-uppercase text-xs text-outline uppercase tracking-wider">
                  Taxes &amp; Fast Delivery Included
                </span>
              </div>

              {/* 360 feature highlight */}
              <div className="p-3 bg-secondary-container/30 rounded-xl border border-secondary-fixed/50 flex items-start gap-2.5">
                <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                  view_in_ar
                </span>
                <div className="text-xs">
                  <div className="font-label-uppercase uppercase font-semibold text-primary tracking-wider">
                    360° View Is On
                  </div>
                  <div className="text-on-surface-variant text-[11px] leading-relaxed">
                    Turn the shoe above to see the hand stitching, heel and arch
                    from every side.
                  </div>
                </div>
              </div>

              {/* Size selection */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center justify-between">
                  <span className="font-label-uppercase text-xs font-semibold uppercase text-primary tracking-wider">
                    Choose EU Size
                  </span>
                  <SizeGuideLink className="text-xs text-secondary hover:underline font-label-uppercase">
                    Size Guide (Fits True to Size)
                  </SizeGuideLink>
                </div>
                <div
                  aria-label="Shoe sizes"
                  className="grid grid-cols-5 gap-1.5"
                  role="radiogroup"
                >
                  {SIZES.map((s) => (
                    <button
                      key={s}
                      aria-checked={s === size}
                      className={`h-9 rounded text-xs font-medium transition-all cursor-pointer ${
                        s === size
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container hover:bg-surface-container-high text-on-surface"
                      }`}
                      onClick={() => selectSize(s)}
                      role="radio"
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-2 flex items-center gap-3">
                <button
                  className="btn-shimmer flex-1 py-3.5 px-space-lg bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed font-label-uppercase text-xs uppercase tracking-widest transition-all duration-300 rounded-full shadow-md flex items-center justify-center gap-2 cursor-pointer"
                  onClick={addToBag}
                  type="button"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {inBag ? "check" : "shopping_bag"}
                  </span>
                  <span>{inBag ? "In Bag · View" : "Add to Bag"}</span>
                </button>
                <button
                  aria-label={
                    saved ? "Remove from Wishlist" : "Add to Wishlist"
                  }
                  aria-pressed={saved}
                  className={`w-12 h-12 rounded-full bg-surface-container hover:bg-surface-container-high flex items-center justify-center hover:text-error transition-all cursor-pointer ${
                    saved ? "text-error" : "text-on-surface"
                  }${popping ? " animate-heart-pop" : ""}`}
                  onClick={toggleWishlist}
                  type="button"
                >
                  <span
                    className={`material-symbols-outlined text-[20px]${saved ? " icon-filled" : ""}`}
                  >
                    favorite
                  </span>
                </button>
              </div>
            </div>

            {/* Reassurance footer */}
            <div className="border-t border-outline-variant/20 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-xs">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  payments
                </span>
                <span>Cash on Delivery, EasyPaisa &amp; JazzCash accepted</span>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-body-sm text-xs">
                <span className="material-symbols-outlined text-secondary text-[16px]">
                  chat
                </span>
                <span>Unsure about your size? Ask us on WhatsApp</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
