"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { applyCouponCode, markCouponRevealed } from "@/lib/coupon-actions";
import { clock, useCooldown } from "@/lib/use-cooldown";
import { useReveal } from "./Reveal";
import { requireLogin } from "@/lib/require-login";
import { showToast } from "@/lib/toast";
import { showNotice } from "@/lib/notice";
import { alertDialog } from "@/components/Dialogs";

const REVEAL_AT = 50; // % scratched before the rest of the foil falls away
/** Brush radius in CSS px: a coin's edge, not a fingertip. */
const BRUSH = 24;
/**
 * Share of the gold one stamp removes. Stamps overlap 3–4 times along a stroke,
 * so one swipe leaves a thin gold film (it already counts towards the reveal)
 * and a second rub clears it, like real foil.
 */
const ERASE = 0.2;
/** Distance between stamps along a stroke (they overlap, so one pass leaves a gold film). */
const STEP = BRUSH * 0.45;
/** Gold crumbs alive at once, at most. */
const MAX_FLAKES = 140;
const FLAKE_COLORS = ["#d4af37", "#e8c766", "#aa771c", "#f5e4b3", "#b8912f"];
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
  /** Gold crumbs that fall where the foil is scratched (a layer over the foil, never clickable). */
  const flakesRef = useRef<HTMLCanvasElement>(null);
  const flakes = useRef<{ x: number; y: number; vx: number; vy: number; size: number; rot: number; vRot: number; life: number; decay: number; color: string }[]>([]);
  const flakesRunning = useRef(false);
  const lastBuzz = useRef(0);
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
  // Too many wrong codes on this account: Apply to Bag locks and counts down.
  const [limited, setLimited] = useState<{ s: number } | null>(null);
  const applyWait = useCooldown(limited?.s, limited);

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
    // Shorter cards (phones) get a smaller emblem, so nothing overlaps.
    ctx.arc(cx, cy, Math.min(64, height * 0.22), 0, Math.PI * 2);
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

    // How to scratch is said once, by the floating hint below the foil.
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

  // Set at the first reveal: moves after it (the finger still down) must not
  // fire the burst again. Cleared by "Scratch again".
  const done = useRef(false);
  const reveal = useCallback(
    (celebrate = true) => {
      if (done.current) return;
      done.current = true;
      drawing.current = false;
      last.current = null;
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

  /** One rough scrape: an irregular, ragged blob plus a few nicks around its edge. */
  const stamp = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
    const points = 10 + Math.floor(Math.random() * 6);
    const turn = Math.random() * Math.PI * 2;
    ctx.beginPath();
    for (let k = 0; k < points; k++) {
      const a = turn + (k / points) * Math.PI * 2 + (Math.random() - 0.5) * 0.4;
      const r = BRUSH * (0.55 + Math.random() * 0.5);
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r;
      if (k === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    for (let k = 0; k < 3; k++) {
      const a = Math.random() * Math.PI * 2;
      const r = BRUSH * (0.8 + Math.random() * 0.45);
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, 1 + Math.random() * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  /** Gold crumbs falling off where the foil was scraped. */
  const runFlakes = () => {
    const c = flakesRef.current;
    const cctx = c?.getContext("2d");
    if (!c || !cctx || flakesRunning.current) return;
    flakesRunning.current = true;
    const frame = () => {
      const dpr = window.devicePixelRatio || 1;
      cctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cctx.clearRect(0, 0, c.width, c.height);
      const alive = flakes.current.filter((f) => f.life > 0);
      flakes.current = alive;
      for (const f of alive) {
        f.x += f.vx;
        f.y += f.vy;
        f.vy += 0.22;
        f.vx *= 0.98;
        f.rot += f.vRot;
        f.life -= f.decay;
        cctx.save();
        cctx.translate(f.x, f.y);
        cctx.rotate(f.rot);
        cctx.globalAlpha = Math.max(0, f.life);
        cctx.fillStyle = f.color;
        cctx.beginPath(); // a little shard, not a square
        cctx.moveTo(-f.size / 2, -f.size / 3);
        cctx.lineTo(f.size / 2, -f.size / 2);
        cctx.lineTo(f.size / 3, f.size / 2);
        cctx.closePath();
        cctx.fill();
        cctx.restore();
      }
      if (alive.length) requestAnimationFrame(frame);
      else {
        cctx.clearRect(0, 0, c.width, c.height);
        flakesRunning.current = false;
      }
    };
    requestAnimationFrame(frame);
  };

  const shedFlakes = (x: number, y: number) => {
    const c = flakesRef.current;
    if (!c || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    if (c.width !== Math.round(rect.width * dpr)) {
      c.width = Math.round(rect.width * dpr);
      c.height = Math.round(rect.height * dpr);
    }
    const count = 1 + Math.floor(Math.random() * 2);
    for (let k = 0; k < count && flakes.current.length < MAX_FLAKES; k++) {
      flakes.current.push({
        x: x + (Math.random() - 0.5) * BRUSH,
        y: y + (Math.random() - 0.5) * BRUSH * 0.6,
        vx: (Math.random() - 0.5) * 2.4,
        vy: -Math.random() * 1.6,
        size: 1.5 + Math.random() * 2.5,
        rot: Math.random() * Math.PI,
        vRot: (Math.random() - 0.5) * 0.4,
        life: 1,
        decay: 0.025 + Math.random() * 0.025,
        color: FLAKE_COLORS[Math.floor(Math.random() * FLAKE_COLORS.length)],
      });
    }
    runFlakes();
  };

  /** A short buzz while a finger scratches (Android; iPhones don't allow it from websites). */
  const buzz = (e: React.PointerEvent) => {
    if (e.pointerType !== "touch" || !("vibrate" in navigator)) return;
    const now = performance.now();
    if (now - lastBuzz.current < 60) return;
    lastBuzz.current = now;
    try {
      navigator.vibrate(6);
    } catch {
      /* not allowed here */
    }
  };

  /** Scrapes from the last point to this one with overlapping rough stamps, each taking off part of the gold. */
  const scratchAt = (x: number, y: number) => {
    const ctx = canvasRef.current?.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.globalAlpha = ERASE;
    ctx.fillStyle = "#000";
    const from = last.current ?? { x, y };
    const dist = Math.hypot(x - from.x, y - from.y);
    const steps = Math.max(1, Math.ceil(dist / STEP));
    for (let k = 1; k <= steps; k++) {
      const px = from.x + ((x - from.x) * k) / steps;
      const py = from.y + ((y - from.y) * k) / steps;
      stamp(ctx, px, py);
      if (k % 2 === 0 || steps === 1) shedFlakes(px, py);
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
    done.current = false;
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
    if (!r.ok && r.retryAfter) {
      setLimited({ s: r.retryAfter });
      return;
    }
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
      {/* Same ticket look as "Coupons" on the account page: zigzag edges, grey frame, gold strip. */}
      <div className="relative max-w-4xl mx-auto mb-space-xl">
        {/* The shadow sits on a still layer behind the card: a filter around the
            scratch canvas itself would be recalculated on every stroke. */}
        <div aria-hidden="true" className="absolute inset-0 drop-shadow-[0_14px_28px_rgba(33,27,25,0.16)]">
          <div className="ticket-zigzag ticket-zigzag-lg w-full h-full bg-surface-container-highest" />
        </div>
        <div className="ticket-zigzag ticket-zigzag-lg py-1.5 sm:py-3 lg:py-4 bg-surface-container-highest relative">
          <div className="bg-surface-container-lowest rounded-md p-3 sm:p-6 lg:p-10 pr-5 sm:pr-8 lg:pr-12 relative overflow-hidden shadow-sm">
            {/* Gold edge, like the tickets */}
            <span aria-hidden="true" className="absolute inset-y-0 right-0 w-2 sm:w-2.5 bg-gradient-to-b from-[#dfbe76] via-[#d4af37] to-[#aa771c]" />
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
            <div className="flex items-center justify-between gap-space-sm pb-space-xs sm:pb-space-sm mb-space-xs sm:mb-space-sm">
              <div className="flex items-center gap-space-sm min-w-0">
                {/* The site icon (src/app/icon.png, served at /icon.png). */}
                <Image alt="" className="w-8 h-8 sm:w-10 sm:h-10 shrink-0 object-contain" height={40} src="/icon.png" width={40} />
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
                className="relative min-h-[250px] sm:min-h-[340px] md:min-h-[380px] p-3 sm:p-6 md:p-8 flex flex-col justify-between gap-space-xs sm:gap-space-sm bg-gradient-to-br from-surface-container-lowest via-surface-container-low to-secondary-container/20"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full bg-secondary text-on-secondary font-label-uppercase text-[9px] sm:text-[10px] tracking-widest">
                      <span className="material-symbols-outlined icon-filled text-[12px] sm:text-[13px]">workspace_premium</span>
                      {surprise ? "SURPRISE DISCOUNT" : "COUPON"}
                    </span>
                    <h2 className="font-headline-md text-[28px] leading-tight sm:text-headline-md text-primary pt-1 sm:pt-space-xs font-normal">{headline}</h2>
                    <p className="font-body-sm text-[12px] leading-snug sm:text-body-sm md:font-body-md md:text-body-md text-secondary font-medium">{conditions}</p>
                  </div>
                  <div className="hidden sm:flex flex-col items-center justify-center p-3 rounded-md bg-surface-container-highest/60 text-center min-w-[110px]">
                    <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                    <span className="font-label-uppercase text-[9px] tracking-wider text-on-surface mt-1">GENUINE OFFER</span>
                    <span className="font-label-sm text-[10px] text-outline">ŔOSE ATELIER</span>
                  </div>
                </div>

                {/* Code with copy / apply */}
                <div className="px-3 py-2.5 sm:p-4 md:p-5 rounded-lg bg-surface-container-lowest shadow-sm border border-dashed border-secondary/50 sm:border-transparent flex flex-col md:flex-row items-center justify-between gap-2 sm:gap-space-md">
                  <div className="space-y-0.5 text-center md:text-left">
                    <span className="font-label-uppercase text-[8px] sm:text-label-uppercase text-outline tracking-[0.2em] sm:tracking-wider block">COUPON CODE</span>
                    <span className="font-headline-sm text-[20px] leading-tight sm:text-headline-sm tracking-[0.14em] sm:tracking-[0.18em] text-primary font-bold select-all selection:bg-secondary-container break-all">{code}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-space-xs w-full md:w-auto justify-center">
                    <button
                      className={`sm:w-full md:w-auto whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 h-7 sm:h-auto px-3 sm:px-space-md sm:py-2.5 rounded-full text-[9px] sm:text-label-uppercase ${copied ? "bg-secondary" : "bg-primary"} text-on-primary hover:bg-secondary transition-all font-label-uppercase tracking-wider shadow-sm`}
                      disabled={!revealed}
                      onClick={copy}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px] sm:text-[16px]">{copied ? "check" : "content_copy"}</span>
                      <span>{copied ? "COPIED" : "COPY CODE"}</span>
                    </button>
                    <button
                      className={`sm:w-full md:w-auto whitespace-nowrap flex items-center justify-center gap-1 sm:gap-2 h-7 sm:h-auto px-3 sm:px-space-md sm:py-2.5 rounded-full text-[9px] sm:text-label-uppercase ${applied ? "bg-secondary text-on-secondary" : "bg-secondary-container text-on-secondary-fixed"} hover:bg-secondary hover:text-on-secondary transition-all font-label-uppercase tracking-wider disabled:opacity-60`}
                      disabled={!revealed || applying || applyWait > 0}
                      onClick={applyToBag}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-[13px] sm:text-[16px]">{applyWait > 0 ? "schedule" : "shopping_bag"}</span>
                      <span className="tabular-nums">{applied ? "ADDED TO BAG" : applyWait > 0 ? `TRY AGAIN IN ${clock(applyWait)}` : applying ? "ADDING…" : "APPLY TO BAG"}</span>
                    </button>
                  </div>
                </div>

                {/* Terms and actions */}
                <div className="pt-1 sm:pt-space-xs flex flex-row items-center justify-between gap-2 sm:gap-space-sm text-on-surface-variant font-body-sm text-body-sm">
                  <div className="flex items-center gap-1 sm:gap-space-xs text-[10px] sm:text-[12px] leading-tight min-w-0">
                    <span className="material-symbols-outlined text-secondary text-[13px] sm:text-[16px]">schedule</span>
                    <span>
                      {validUntil ? (
                        <>
                          Valid until <strong>{validUntil}</strong>
                        </>
                      ) : (
                        "No end date"
                      )}{" "}
                      <span className="hidden sm:inline">• Use it online at checkout</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-x-space-sm whitespace-nowrap shrink-0">
                    <Link className="font-label-uppercase text-[9px] sm:text-label-uppercase text-secondary hover:text-primary transition-colors underline underline-offset-4" href="/collections">
                      Shop Now
                    </Link>
                    <span className="hidden sm:inline text-outline">•</span>
                    <a
                      aria-label="Share on WhatsApp"
                      className="font-label-uppercase text-[9px] sm:text-label-uppercase text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 h-6 sm:h-auto px-2 sm:px-0 rounded-full ring-1 ring-outline-variant sm:ring-0"
                      href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <span className="material-symbols-outlined text-[12px] sm:text-[14px]">share</span>
                      <span>Share<span className="hidden sm:inline"> on WhatsApp</span></span>
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
                    buzz(e);
                  }}
                  onPointerMove={(e) => {
                    if (!drawing.current || done.current) return;
                    const p = pos(e);
                    scratchAt(p.x, p.y);
                    buzz(e);
                    measure();
                  }}
                  onPointerUp={() => {
                    const was = drawing.current;
                    drawing.current = false;
                    last.current = null;
                    if (was && !done.current) measure(true);
                  }}
                  role="img"
                />
                {/* Gold crumbs from scratching: drawn above the foil, never in the way of a finger. */}
                <canvas
                  ref={flakesRef}
                  aria-hidden="true"
                  className={`absolute inset-0 w-full h-full pointer-events-none z-[25] ${revealed ? "hidden" : ""}`}
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
            <div className="mt-space-sm sm:mt-space-md pt-space-xs sm:pt-space-sm border-t border-dashed border-outline-variant/60 flex flex-row items-center justify-between gap-space-sm text-on-surface-variant font-label-uppercase text-[9px] sm:text-[10px] tracking-widest">
              <div className="flex flex-wrap items-center gap-space-md min-w-0">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px] text-secondary">lock</span>
                  {usesNote}
                </span>
                <span className="hidden sm:inline">ŔOSE ATELIER • KARACHI</span>
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
