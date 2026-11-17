"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { countdown, saleState, saleTime, TEASER_MS, type SaleEvent } from "@/lib/sale-events";
import { useSaleClock } from "./SaleProvider";

/** "Up to X%" per sale id, worked out on the server from the listings each sale covers. */
export type SaleUpTo = Record<string, number>;

/** The sale to show now: the live one with the biggest discount, else the next teased one. */
export function featuredSale(events: SaleEvent[], upTo: SaleUpTo, now: number): { event: SaleEvent; live: boolean } | null {
  const live = events.filter((e) => saleState(e, now) === "live" && (upTo[e.id] ?? 0) > 0);
  if (live.length) return { event: live.sort((a, b) => (upTo[b.id] ?? 0) - (upTo[a.id] ?? 0))[0], live: true };
  const soon = events
    .filter((e) => e.teaser && saleState(e, now) === "scheduled" && Date.parse(e.startsAt) - now <= TEASER_MS && (upTo[e.id] ?? 0) > 0)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return soon.length ? { event: soon[0], live: false } : null;
}

/** Re-renders every second while `on` (for the countdown). */
function useSecondTick(on: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

/**
 * The highlighted band at the top of the home page while a sale is live (or a
 * "starts in…" teaser shortly before). It sits over the top of the hero, under
 * the header. Hidden until the page knows the time (the page is pre-built).
 */
export default function SaleBanner({ upTo }: { upTo: SaleUpTo }) {
  const { events, now: clock } = useSaleClock();
  const pick = clock === null ? null : featuredSale(events, upTo, clock);
  const ticking = !!pick && (pick.event.countdown || !pick.live);
  const now = Math.max(useSecondTick(ticking), clock ?? 0);
  if (!pick) return null;
  const { event, live } = pick;
  const pct = upTo[event.id] ?? 0;
  const left = (live ? Date.parse(event.endsAt) : Date.parse(event.startsAt)) - now;

  return (
    <div
      aria-label={live ? `${event.name}, up to ${pct}% off` : `${event.name} starts soon`}
      className="absolute inset-x-0 top-28 z-20 drop-shadow-[0_6px_14px_rgba(0,0,0,0.35)]"
      role="region"
    >
      {/* A black satin ribbon across the hero, like gift wrap: notched tails at both edges, gold stitching. */}
      <div className="relative bg-[#0b0a09] text-surface-container-lowest [clip-path:polygon(0_0,100%_0,calc(100%-16px)_50%,100%_100%,0_100%,16px_50%)]">
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-linear-to-b from-white/12 via-white/0 to-black/40" />
        {/* Rose petals falling inside the ribbon only, behind its text; they go when the ribbon goes. */}
        <SalePetals />
        <span aria-hidden="true" className="pointer-events-none absolute left-6 right-6 top-[5px] border-t border-dashed border-secondary-fixed/45" />
        <span aria-hidden="true" className="pointer-events-none absolute left-6 right-6 bottom-[5px] border-t border-dashed border-secondary-fixed/45" />
      <div className="relative max-w-[1536px] mx-auto px-9 lg:px-margin pt-6 pb-3.5 sm:py-4 flex flex-wrap items-center justify-center sm:justify-between gap-x-space-md gap-y-1.5 text-center sm:text-left">
        <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5">
          <span className="font-headline-sm italic text-[18px] sm:text-[22px] leading-none text-secondary-fixed">{event.name}</span>
          <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.24em]">
            {live ? `Up to ${pct}% off` : "Coming soon"}
            {event.headline ? <span className="hidden md:inline"> · {event.headline}</span> : null}
          </span>
        </p>
        <div className="flex items-center gap-space-md">
          {(event.countdown || !live) && left > 0 ? (
            // Phones: a micro countdown pinned to the ribbon's top-right corner.
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80 tabular-nums max-sm:absolute max-sm:top-[9px] max-sm:right-7 max-sm:text-[7.5px] max-sm:tracking-[0.16em] max-sm:leading-none">
              {live ? "Ends in" : "Starts in"} <span className="text-secondary-fixed">{countdown(left)}</span>
            </span>
          ) : (
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80 max-sm:absolute max-sm:top-[9px] max-sm:right-7 max-sm:text-[7.5px] max-sm:tracking-[0.16em] max-sm:leading-none">
              {live ? `Until ${saleTime(event.endsAt)}` : `From ${saleTime(event.startsAt)}`}
            </span>
          )}
          {live && (
            <Link
              className="link-draw [--draw-color:var(--color-secondary-fixed)] font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-secondary-fixed whitespace-nowrap"
              href="/collections?sale=1"
            >
              Shop the Sale →
            </Link>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

/**
 * A few petals, in the home page silk's champagne and gold, drifting down inside the sale ribbon (owner, 2026-11-18:
 * on the ribbon only, never over the hero; styles and motion in globals.css
 * `.sale-petals`). Sparse on purpose: 6 on phones, 8 from `sm:` up. Each has
 * its own column, size, speed and start.
 */
const PETALS = [
  { x: "5%", s: 10, t: 6.5, d: -1, w: 10 },
  { x: "18%", s: 8, t: 8, d: -4.5, w: 14 },
  { x: "31%", s: 11, t: 6, d: -2.5, w: 9, wide: true },
  { x: "46%", s: 9, t: 7.5, d: -6, w: 12 },
  { x: "60%", s: 10, t: 7, d: -0.5, w: 10 },
  { x: "72%", s: 8, t: 8.5, d: -3.5, w: 14, wide: true },
  { x: "84%", s: 10, t: 6.5, d: -5.5, w: 11 },
  { x: "93%", s: 8, t: 8, d: -2, w: 12 },
];

function SalePetals() {
  return (
    <div aria-hidden="true" className="sale-petals">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`sale-petal${p.wide ? " hidden sm:block" : ""}`}
          style={{ "--x": p.x, "--s": `${p.s}px`, "--t": `${p.t}s`, "--d": `${p.d}s`, "--w": `${p.w}px` } as React.CSSProperties}
        >
          <span>
            <svg viewBox="0 0 20 24" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id={`petal-${i}`} x1="0" x2="1" y1="0" y2="1">
                  {/* The home page silk's colours (SilkBackdrop): champagne, sand, soft gold. */}
                  <stop offset="0" style={{ stopColor: "var(--color-secondary-fixed)" }} />
                  <stop offset="0.55" style={{ stopColor: "var(--color-secondary-fixed-dim)" }} />
                  <stop offset="1" stopColor="#b8a489" />
                </linearGradient>
              </defs>
              {/* A rose petal: rounded top with a soft notch, narrowing to the base. */}
              <path d="M10 23 C4 19 1 13 1.5 8 C2 3.5 5 1 8 1.5 C9 1.7 9.6 2.6 10 3.4 C10.4 2.6 11 1.7 12 1.5 C15 1 18 3.5 18.5 8 C19 13 16 19 10 23 Z" fill={`url(#petal-${i})`} />
              <path d="M10 22 C9.5 15 9.8 9 10 4" fill="none" style={{ stroke: "var(--color-secondary)" }} strokeOpacity="0.35" strokeWidth="0.6" />
            </svg>
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * The announcement bar: while a sale is live its message leads (then the
 * usual announcements). Same markup as before otherwise.
 */
export function Announcements({ announcements, upTo }: { announcements: string[]; upTo: SaleUpTo }) {
  const { events, now } = useSaleClock();
  const pick = now === null ? null : featuredSale(events, upTo, now);
  const messages = pick?.live
    ? [`${pick.event.name} · Up to ${upTo[pick.event.id]}% off · Until ${saleTime(pick.event.endsAt)}`, ...announcements]
    : announcements;
  return (
    <div className="animate-marquee items-center gap-space-xl font-label-uppercase text-label-uppercase uppercase text-primary-fixed">
      <Group messages={messages} />
      <Group hidden messages={messages} />
    </div>
  );
}

function Group({ messages, hidden }: { messages: string[]; hidden?: boolean }) {
  return (
    <span aria-hidden={hidden ? "true" : undefined} className="flex items-center gap-space-md">
      {messages.map((text, i) => (
        <span key={`${i}-${text}`} className="contents">
          {(hidden || i > 0) && <span className="text-outline text-[8px]">◆</span>}
          <span>{text}</span>
        </span>
      ))}
    </span>
  );
}
