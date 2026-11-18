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
      className="absolute inset-x-0 top-[7.75rem] z-20 px-3 sm:px-margin drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]"
      role="region"
    >
      {/* An ornate plaque, after the owner's design: a gold frame with pointed, fleur-tipped
          ends and a crest, around a black damask panel (styles: globals.css .sale-plaque). */}
      <div className="sale-plaque max-w-[1180px] mx-auto text-surface-container-lowest">
        <span aria-hidden="true" className="pf pf-frame" />
        <span aria-hidden="true" className="pf pf-groove" />
        <span aria-hidden="true" className="pf pf-line" />
        <span aria-hidden="true" className="pf pf-panel">
          {/* Rose petals falling inside the panel only, behind the text; they go with the plaque. */}
          <SalePetals />
        </span>
        <Fleur className="pf-tip pf-tip-l" />
        <Fleur className="pf-tip pf-tip-r" />
        <Crest />
      <div className="relative px-[calc(var(--p)+14px)] pt-6 pb-3.5 sm:py-4 flex flex-wrap items-center justify-center sm:justify-between gap-x-space-md gap-y-1.5 text-center sm:text-left">
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
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80 tabular-nums max-sm:absolute max-sm:top-[11px] max-sm:right-[calc(var(--p)+10px)] max-sm:text-[7.5px] max-sm:tracking-[0.16em] max-sm:leading-none">
              {live ? "Ends in" : "Starts in"} <span className="text-secondary-fixed">{countdown(left)}</span>
            </span>
          ) : (
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80 max-sm:absolute max-sm:top-[11px] max-sm:right-[calc(var(--p)+10px)] max-sm:text-[7.5px] max-sm:tracking-[0.16em] max-sm:leading-none">
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
 * A few tiny champagne-gold roses (owner, 2026-11-18), tumbling down inside the sale plaque (owner, 2026-11-18:
 * on the ribbon only, never over the hero; styles and motion in globals.css
 * `.sale-petals`). Sparse on purpose: 6 on phones, 8 from `sm:` up. Each has
 * its own column, size, speed and start.
 */
const PETALS = [
  { x: "5%", s: 12, t: 6.5, d: -1, w: 10 },
  { x: "18%", s: 10, t: 8, d: -4.5, w: 14 },
  { x: "31%", s: 13, t: 6, d: -2.5, w: 9, wide: true },
  { x: "46%", s: 11, t: 7.5, d: -6, w: 12 },
  { x: "60%", s: 12, t: 7, d: -0.5, w: 10 },
  { x: "72%", s: 10, t: 8.5, d: -3.5, w: 14, wide: true },
  { x: "84%", s: 12, t: 6.5, d: -5.5, w: 11 },
  { x: "93%", s: 10, t: 8, d: -2, w: 12 },
];

/** Gold gradient shared by the plaque's ornaments. */
function GoldDefs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0" stopColor="#f8e7ae" />
        <stop offset="0.45" stopColor="#c99a49" />
        <stop offset="0.7" stopColor="#8e6a2c" />
        <stop offset="1" stopColor="#f1d88e" />
      </linearGradient>
    </defs>
  );
}

/** The fleur ornament on each point of the plaque (drawn pointing left; mirrored on the right). */
function Fleur({ className }: { className: string }) {
  const id = `fleur-${className.includes("-r") ? "r" : "l"}`;
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <GoldDefs id={id} />
      <g fill={`url(#${id})`} stroke="#5a3f12" strokeWidth="0.7">
        {/* Spear tip, two curling leaves and a bead, like a baroque frame corner. */}
        <path d="M2 20 L14 16.5 L14 23.5 Z" />
        <path d="M14 20 C18 10 26 8 31 11 C27 12 22 15 19 20 C22 25 27 28 31 29 C26 32 18 30 14 20 Z" />
        <path d="M24 20 C27 16 31 15 35 16.5 C33 18 33 22 35 23.5 C31 25 27 24 24 20 Z" />
        <circle cx="13.5" cy="20" r="2.4" />
      </g>
    </svg>
  );
}

/** The small crest at the top centre of the plaque. */
function Crest() {
  return (
    <svg aria-hidden="true" className="pf-crest" viewBox="0 0 80 22" xmlns="http://www.w3.org/2000/svg">
      <GoldDefs id="crest" />
      <g fill="url(#crest)" stroke="#5a3f12" strokeWidth="0.6">
        <path d="M40 1 C43 6 46 8 40 15 C34 8 37 6 40 1 Z" />
        <path d="M38 13 C30 6 20 7 14 12 C20 11 27 13 33 18 L40 21 L47 18 C53 13 60 11 66 12 C60 7 50 6 42 13 L40 15 Z" />
        <circle cx="12" cy="13" r="2" />
        <circle cx="68" cy="13" r="2" />
      </g>
    </svg>
  );
}

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
            {/* A tiny rose seen from above: five outer petals around a swirled centre, in the home silk's champagne and gold. */}
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <radialGradient cx="50%" cy="50%" id={`rose-${i}`} r="60%">
                  <stop offset="0" style={{ stopColor: "var(--color-secondary-fixed-dim)" }} />
                  <stop offset="0.65" style={{ stopColor: "var(--color-secondary-fixed)" }} />
                  <stop offset="1" stopColor="#b8a489" />
                </radialGradient>
              </defs>
              <g fill={`url(#rose-${i})`} stroke="#9c855f" strokeOpacity="0.55" strokeWidth="0.45">
                {[0, 72, 144, 216, 288].map((a) => (
                  <path key={a} d="M12 12 C7.4 10.6 6.3 4.2 12 2.6 C17.7 4.2 16.6 10.6 12 12 Z" transform={`rotate(${a} 12 12)`} />
                ))}
                <circle cx="12" cy="12" r="5.2" />
                {/* An inner ring of smaller, overlapping petals, turned between the outer ones. */}
                {[18, 108, 198, 288].map((a) => (
                  <path key={a} d="M12 12 C9.1 10.9 8.9 6.7 12 5.5 C15.1 6.7 14.9 10.9 12 12 Z" transform={`rotate(${a} 12 12)`} />
                ))}
                <circle cx="12" cy="12" r="2.9" />
              </g>
              {/* The swirl at the heart of the rose. */}
              <path
                d="M12.3 12.2 a0.9 0.9 0 1 1 -0.6 -1.4 a2 2 0 1 1 -1.3 3.1 a3.1 3.1 0 1 1 4.4 -3.9"
                fill="none"
                strokeLinecap="round"
                strokeWidth="0.75"
                style={{ stroke: "var(--color-secondary)" }}
                strokeOpacity="0.6"
              />
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
