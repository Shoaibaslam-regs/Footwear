"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyCouponCode, markCouponRevealed } from "@/lib/coupon-actions";
import { useReveal } from "./Reveal";
import { requireLogin } from "@/lib/require-login";
import { showToast } from "@/lib/toast";
import { showNotice } from "@/lib/notice";
import { alertDialog } from "@/components/Dialogs";

const REVEAL_AT = 45; // % scratched before the rest of the foil falls away
const BRUSH = 28;
const seenKey = (code: string) => `rose:offer-revealed:${code}`;

/**
 * The scratch-card coupon from the offer design: a gold foil canvas over the
 * coupon. Scratching 45% (or "Show code now") reveals it with a confetti burst.
 * Once revealed it stays revealed on this device.
 */
export default function ScratchCard({
  code,
  headline,
  conditions,
  validUntil,
  usesNote,
  greetingName,
  shareText,
  surprise = false,
}: {
  code: string;
  headline: string;
  conditions: string;
  /** "31 March", or null for no end date. */
  validUntil: string | null;
  /** e.g. "ONE USE PER CUSTOMER" */
  usesNote: string;
  greetingName: string | null;
  shareText: string;
  /** A customer's own card from a surprise campaign. */
  surprise?: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const lastCheck = useRef(0);
  const [percent, setPercent] = useState(0);
  // Shared with the page so coupon prices stay hidden until the card is scratched.
  const { revealed, setRevealed } = useReveal();
  const [touched, setTouched] = useState(false);
  const [copied, setCopied] = useState(false);
  const [applied, setApplied] = useState(false);
  const [applying, setApplying] = useState(false);

  /* ---------- Foil ---------- */

  const drawFoil = useCallback(async () => {
    const canvas = canvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const serif = getComputedStyle(stage.querySelector("h2") ?? stage).fontFamily;
    const sans = getComputedStyle(document.body).fontFamily;
    // The Ŕ needs the latin-ext font file; wait for it so the foil isn't drawn in a fallback face.
    try {
      await Promise.all([document.fonts.load(`700 30px ${serif}`, "ŔOSE"), document.fonts.load(`600 11px ${sans}`, "SCRATCH")]);
    } catch {
      /* draw with whatever is available */
    }
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const width = rect.width;
    const height = rect.height;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);

    // 1. Metallic gold foil gradient
    const gold = ctx.createLinearGradient(0, 0, width, height);
    gold.addColorStop(0.0, "#b8860b");
    gold.addColorStop(0.2, "#dfbe76");
    gold.addColorStop(0.4, "#f5e4b3");
    gold.addColorStop(0.55, "#d4af37");
    gold.addColorStop(0.75, "#aa771c");
    gold.addColorStop(0.9, "#f3d994");
    gold.addColorStop(1.0, "#996515");
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, width, height);

    // 2. Brushed foil specks
    ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
    for (let i = 0; i < 700; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(33, 27, 25, 0.08)";
    for (let i = 0; i < 400; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * width, Math.random() * height, Math.random() * 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. Double frame and the centre medal
    ctx.save();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(16, 16, width - 32, height - 32);
    ctx.strokeStyle = "rgba(40, 25, 10, 0.25)";
    ctx.strokeRect(20, 20, width - 40, height - 40);

    const cx = width / 2;
    const cy = height / 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 64, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255, 245, 220, 0.15)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.4)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Debossed lettering
    ctx.shadowColor = "rgba(255, 255, 255, 0.4)";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1;
    ctx.shadowBlur = 2;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const spaced = ctx as CanvasRenderingContext2D & { letterSpacing?: string };

    ctx.fillStyle = "#4a3311";
    ctx.font = `700 ${width < 380 ? 24 : 30}px ${serif}`;
    spaced.letterSpacing = "2px";
    ctx.fillText("ŔOSE ATELIER", cx, cy - 8);

    ctx.font = `600 9px ${sans}`;
    spaced.letterSpacing = "5px";
    ctx.fillStyle = "#3a250b";
    ctx.fillText("SCRATCH CARD", cx, cy + 22);

    const narrow = width < 400;
    ctx.font = `600 ${narrow ? 10 : 11}px ${sans}`;
    spaced.letterSpacing = narrow ? "1.5px" : "3px";
    ctx.fillStyle = "#2c1906";
    ctx.fillText("✦ SCRATCH TO REVEAL ✦", cx, height - (narrow ? 82 : 78), width - 48);

    // On phones the floating hint below says the same, so the second line is desktop-only.
    if (!narrow) {
      ctx.font = `400 10px ${sans}`;
      spaced.letterSpacing = "1px";
      ctx.fillStyle = "#5c3a10";
      ctx.fillText("Rub the gold with your finger or mouse", cx, height - 62, width - 48);
    }
    ctx.restore();
  }, []);

  /* ---------- Reveal ---------- */

  const confetti = useCallback(() => {
    const c = confettiRef.current;
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cctx = c.getContext("2d");
    if (!cctx) return;
    const rect = c.getBoundingClientRect();
    c.width = rect.width;
    c.height = rect.height;
    const colors = ["#d4af37", "#f5e4b3", "#ffffff", "#aa771c", "#e4e2df"];
    const parts = Array.from({ length: 90 }, () => ({
      x: rect.width / 2,
      y: rect.height / 2,
      vx: (Math.random() - 0.5) * 14,
      vy: (Math.random() - 0.7) * 16,
      size: Math.random() * 5 + 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      life: 1,
      decay: Math.random() * 0.015 + 0.01,
    }));
    const frame = () => {
      cctx.clearRect(0, 0, c.width, c.height);
      let active = 0;
      for (const p of parts) {
        if (p.life <= 0) continue;
        active++;
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.28;
        p.rotation += p.vRot;
        p.life -= p.decay;
        cctx.save();
        cctx.translate(p.x, p.y);
        cctx.rotate((p.rotation * Math.PI) / 180);
        cctx.fillStyle = p.color;
        cctx.globalAlpha = Math.max(0, p.life);
        cctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.7);
        cctx.restore();
      }
      if (active > 0) requestAnimationFrame(frame);
      else cctx.clearRect(0, 0, c.width, c.height);
    };
    requestAnimationFrame(frame);
  }, []);

  const reveal = useCallback(
    (celebrate = true) => {
      setRevealed(true);
      setPercent(100);
      try {
        localStorage.setItem(seenKey(code), "1");
      } catch {
        /* private mode: it just shows the foil again next time */
      }
      if (celebrate) {
        confetti();
        showNotice({ title: `You got ${headline.replace(/ OFF$/, " off").replace(/^FREE DELIVERY$/, "free delivery")}`, message: `Your code ${code} is ready. Tap Apply to Bag, or use it at checkout.` });
        // Remember it on the account too, so "My Coupons" shows the discount from now on.
        void markCouponRevealed(code).catch(() => {});
      }
    },
    [code, confetti, headline, setRevealed],
  );

  // Already scratched on this device? Skip the foil. Otherwise draw it (and redraw on resize).
  useEffect(() => {
    if (revealed) return; // the account already remembers this card was scratched
    let seen = false;
    try {
      seen = localStorage.getItem(seenKey(code)) === "1";
    } catch {
      /* ignore */
    }
    if (seen) {
      // Restoring a remembered state from browser storage after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      reveal(false);
      return;
    }
    drawFoil();
    const onResize = () => drawFoil();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // Runs once per card; `revealed` changes are handled by reveal()/reset().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, drawFoil]);

  /* ---------- Scratching ---------- */

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const scratchAt = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, BRUSH, 0, Math.PI * 2);
    ctx.fill();
    if (last.current) {
      ctx.lineWidth = BRUSH * 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.restore();
    last.current = { x, y };
    if (!touched) setTouched(true);
  };

  const measure = (force = false) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return;
    const now = performance.now();
    if (!force && now - lastCheck.current < 180) return;
    lastCheck.current = now;
    const w = canvas.width;
    const h = canvas.height;
    const stepX = Math.max(1, Math.floor(w / 32));
    const stepY = Math.max(1, Math.floor(h / 32));
    const data = ctx.getImageData(0, 0, w, h).data;
    let clear = 0;
    let total = 0;
    for (let y = 0; y < h; y += stepY) {
      for (let x = 0; x < w; x += stepX) {
        if (data[(y * w + x) * 4 + 3] < 128) clear++;
        total++;
      }
    }
    const pct = Math.min(100, Math.round((clear / total) * 100));
    setPercent(pct);
    if (pct >= REVEAL_AT) reveal();
  };

  const reset = () => {
    try {
      localStorage.removeItem(seenKey(code));
    } catch {
      /* ignore */
    }
    setRevealed(false);
    setTouched(false);
    setPercent(0);
    drawFoil();
    showToast("The gold cover is back.");
  };

  /* ---------- Actions ---------- */

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      showToast(`Coupon ${code} copied.`);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      await alertDialog({ title: "Your coupon code", message: code });
    }
  };

  const applyToBag = async () => {
    if (!(await requireLogin("use this coupon"))) return;
    setApplying(true);
    const r = await applyCouponCode(code);
    setApplying(false);
    if (!r.ok) {
      await alertDialog({ title: "Can't use this coupon", message: r.error });
      return;
    }
    setApplied(true);
    showNotice({ title: "Coupon added to bag", message: `${headline} comes off at checkout.`, icon: "shopping_bag" });
  };

  return (
    <>
      {/* Header (from the design): greeting and scratch progress */}
      <div className="text-center max-w-3xl mx-auto pt-space-sm pb-space-lg">
        <span className="font-label-uppercase text-label-uppercase tracking-[0.28em] text-secondary uppercase block mb-space-xs">
          {surprise ? "Surprise Card" : "A Special Offer for You"}
        </span>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary tracking-tight font-normal mb-space-xs">
          {surprise ? "Scratch to See the Discount" : "Scratch to Reveal the Coupon"}
        </h1>
        <p className="hidden sm:block font-body-md text-body-md text-on-surface-variant max-w-2xl mx-auto">
          {greetingName ? (
            <>
              Hi <span className="text-primary font-semibold">{greetingName}</span>, rub
            </>
          ) : (
            "Rub"
          )}{" "}
          the gold card below with your finger or mouse to see your coupon code. Use it at checkout to save on your order.
        </p>
        <div className="mt-space-md inline-flex items-center gap-space-sm sm:gap-space-md bg-surface-container-low px-space-md sm:px-space-lg py-space-xs rounded-full shadow-sm whitespace-nowrap">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined icon-filled text-[18px] text-secondary">auto_awesome</span>
            <span className="font-label-uppercase text-label-uppercase text-on-surface">Scratch Card</span>
          </div>
          <div className="w-16 sm:w-28 h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
            <div className="h-full bg-secondary transition-all duration-300" style={{ width: `${percent}%` }} />
          </div>
          <span aria-live="polite" className="font-label-sm text-label-sm font-semibold text-secondary min-w-[50px] text-right">
            {revealed ? "Revealed" : `${percent}% Scratched`}
          </span>
        </div>
      </div>

      {/* The scratch card */}
      <div className="relative max-w-4xl mx-auto mb-space-xl">
        <div className="p-1.5 sm:p-3 lg:p-4 rounded-xl bg-surface-container-highest shadow-xl relative">
          <div className="bg-surface-container-lowest rounded-lg p-3 sm:p-6 lg:p-10 relative overflow-hidden shadow-sm">
            {/* Guilloché watermark */}
            <div aria-hidden="true" className="absolute inset-0 pointer-events-none opacity-[0.035] flex items-center justify-center">
              <svg fill="none" height="400" viewBox="0 0 600 400" width="600" xmlns="http://www.w3.org/2000/svg">
                <circle cx="300" cy="200" r="180" stroke="currentColor" strokeDasharray="3 3" strokeWidth="1.5" />
                <circle cx="300" cy="200" r="140" stroke="currentColor" strokeWidth="0.8" />
                <circle cx="300" cy="200" r="100" stroke="currentColor" strokeDasharray="6 4" strokeWidth="1.2" />
                <path d="M150 200 C 220 100, 380 100, 450 200 C 380 300, 220 300, 150 200 Z" stroke="currentColor" strokeWidth="0.8" />
                <text className="font-headline-md" fill="currentColor" fontSize="28" letterSpacing="12" textAnchor="middle" x="300" y="210">
                  ŔOSE ATELIER
                </text>
              </svg>
            </div>

            {/* Card header strip */}
            <div className="flex items-center justify-between gap-space-sm pb-space-sm mb-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                {/* The site icon (src/app/icon.png, served at /icon.png). */}
                <Image alt="" className="w-10 h-10 shrink-0 object-contain" height={40} src="/icon.png" width={40} />
                <div className="min-w-0">
                  <span className="font-label-uppercase text-label-uppercase tracking-[0.2em] text-primary font-bold block truncate">ŔOSE ATELIER</span>
                  <span className="font-body-sm text-body-sm text-on-surface-variant text-[11px] block">Karachi, Pakistan</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <span className="font-label-uppercase text-[10px] text-outline block tracking-widest">VALID UNTIL</span>
                <span className="font-body-sm text-body-sm font-semibold tracking-wider text-secondary">{validUntil ?? "No end date"}</span>
              </div>
            </div>

            {/* Scratch stage: the coupon underneath, the foil canvas on top */}
            <div ref={stageRef} className="relative w-full rounded-lg overflow-hidden select-none bg-surface-container-low shadow-inner">
              <div
                aria-hidden={!revealed}
                className="relative min-h-[340px] md:min-h-[380px] p-3.5 sm:p-6 md:p-8 flex flex-col justify-between gap-space-sm bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-container/20"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary text-on-secondary font-label-uppercase text-[10px] tracking-widest">
                      <span className="material-symbols-outlined icon-filled text-[13px]">workspace_premium</span>
                      {surprise ? "SURPRISE DISCOUNT" : "COUPON"}
                    </span>
                    <h2 className="font-headline-lg-mobile text-[34px] leading-tight sm:font-headline-md sm:text-headline-md text-primary pt-space-xs font-normal">{headline}</h2>
                    <p className="font-body-sm text-body-sm sm:font-body-md sm:text-body-md text-secondary font-medium">{conditions}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-md bg-surface-container-highest/60 text-center min-w-[110px]">
                    <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                    <span className="font-label-uppercase text-[9px] tracking-wider text-on-surface mt-1">GENUINE OFFER</span>
                    <span className="font-label-sm text-[10px] text-outline">ŔOSE ATELIER</span>
                  </div>
                </div>

                {/* Code with copy / apply */}
                <div className="p-3 sm:p-4 md:p-5 rounded-lg bg-surface-container-lowest shadow-sm flex flex-col md:flex-row items-center justify-between gap-space-sm sm:gap-space-md">
                  <div className="space-y-0.5 text-center md:text-left">
                    <span className="font-label-uppercase text-label-uppercase text-outline tracking-wider block">COUPON CODE</span>
                    <span className="font-headline-sm text-[20px] sm:text-headline-sm tracking-[0.12em] sm:tracking-[0.18em] text-primary font-bold select-all selection:bg-secondary-container break-all">{code}</span>
                  </div>
                  <div className="grid grid-cols-1 min-[400px]:grid-cols-2 md:flex md:flex-wrap items-center gap-space-xs w-full md:w-auto justify-center">
                    <button
                      className={`w-full md:w-auto whitespace-nowrap flex items-center justify-center gap-2 px-space-md py-2.5 rounded-full ${copied ? "bg-secondary" : "bg-primary"} text-on-primary hover:bg-secondary transition-all font-label-uppercase text-label-uppercase tracking-wider shadow-sm`}
                      disabled={!revealed}
                      onClick={copy}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">{copied ? "check" : "content_copy"}</span>
                      <span>{copied ? "COPIED" : "COPY CODE"}</span>
                    </button>
                    <button
                      className={`w-full md:w-auto whitespace-nowrap flex items-center justify-center gap-2 px-space-md py-2.5 rounded-full ${applied ? "bg-secondary text-on-secondary" : "bg-secondary-container text-on-secondary-fixed"} hover:bg-secondary hover:text-on-secondary transition-all font-label-uppercase text-label-uppercase tracking-wider disabled:opacity-60`}
                      disabled={!revealed || applying}
                      onClick={applyToBag}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                      <span>{applied ? "ADDED TO BAG" : applying ? "ADDING…" : "APPLY TO BAG"}</span>
                    </button>
                  </div>
                </div>

                {/* Terms and actions */}
                <div className="pt-space-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                  <div className="flex items-center gap-space-xs text-[12px]">
                    <span className="material-symbols-outlined text-secondary text-[16px]">schedule</span>
                    <span>
                      {validUntil ? (
                        <>
                          Valid until <strong>{validUntil}</strong>
                        </>
                      ) : (
                        "No end date"
                      )}{" "}
                      • Use it online at checkout
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-space-sm gap-y-1 whitespace-nowrap">
                    <Link className="font-label-uppercase text-label-uppercase text-secondary hover:text-primary transition-colors underline underline-offset-4" href="/collections">
                      Shop Now
                    </Link>
                    <span className="text-outline">•</span>
                    <a
                      className="font-label-uppercase text-label-uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[14px]">share</span> Share on WhatsApp
                    </a>
                  </div>
                </div>
              </div>

              {/* Gold foil (fades away once revealed, as in the design) */}
              <canvas
                  ref={canvasRef}
                  aria-label="Gold scratch card covering your coupon. Use the Show Code Now button to reveal it without scratching."
                  aria-hidden={revealed || undefined}
                  className={`absolute inset-0 w-full h-full cursor-crosshair z-20 touch-none transition-opacity duration-700 ease-out ${revealed ? "opacity-0 pointer-events-none" : ""}`}
                  onPointerCancel={() => {
                    drawing.current = false;
                    last.current = null;
                  }}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    drawing.current = true;
                    const p = pos(e);
                    scratchAt(p.x, p.y);
                  }}
                  onPointerMove={(e) => {
                    if (!drawing.current) return;
                    const p = pos(e);
                    scratchAt(p.x, p.y);
                    measure();
                  }}
                  onPointerUp={() => {
                    drawing.current = false;
                    last.current = null;
                    measure(true);
                  }}
                  role="img"
                />
                <div
                  className={`absolute bottom-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none bg-primary/80 backdrop-blur-md text-on-primary px-3 sm:px-4 py-1.5 rounded-full shadow-lg transition-opacity duration-500 whitespace-nowrap ${touched || revealed ? "opacity-0" : "opacity-100"}`}
                >
                  <span className="font-label-uppercase text-[10px] tracking-[0.18em] uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[14px] text-secondary-fixed">gesture</span>
                    <span className="sm:hidden">Scratch with your finger</span>
                    <span className="hidden sm:inline">Scratch with finger or mouse</span>
                  </span>
                </div>
            </div>

            {/* Bottom ribbon */}
            <div className="mt-space-md pt-space-sm flex flex-col sm:flex-row items-center justify-between gap-space-sm text-on-surface-variant font-label-uppercase text-[10px] tracking-widest">
              <div className="flex flex-wrap items-center justify-center gap-space-md">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                  {usesNote}
                </span>
                <span>ŔOSE ATELIER • KARACHI</span>
              </div>
              <div className="flex items-center gap-space-sm">
                {!revealed ? (
                  <button className="text-secondary hover:text-primary transition-colors underline cursor-pointer" onClick={() => reveal()} type="button">
                    SHOW CODE NOW
                  </button>
                ) : (
                  <button className="hover:text-primary transition-colors cursor-pointer" onClick={reset} type="button">
                    SCRATCH AGAIN
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Confetti */}
        <canvas ref={confettiRef} aria-hidden="true" className="absolute inset-0 pointer-events-none z-40 w-full h-full" />
      </div>
    </>
  );
}
