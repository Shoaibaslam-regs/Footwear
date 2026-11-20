"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { countdown, saleState, saleTime, TEASER_MS, type SaleEvent } from "@/lib/sale-events";
import { useSaleClock } from "./SaleProvider";
import { liveGreeting, plaqueMotif } from "@/lib/greetings";
import type { SaleMotif } from "@/lib/sale-events";

/** sessionStorage key: the plaque's drop has played in this visit. */
const DROPPED_KEY = "rose:sale-dropped";

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
  const { events, greetings, now: clock } = useSaleClock();
  const pick = clock === null ? null : featuredSale(events, upTo, clock);
  // A greeting (lib/greetings.ts): the whole plaque on its own, or a gold scroll above a sale.
  const greeting = clock === null ? null : liveGreeting(greetings, clock);
  const shown = !!pick || !!greeting;
  const ticking = !!pick && (pick.event.countdown || !pick.live);
  const now = Math.max(useSecondTick(ticking), clock ?? 0);
  // The drop plays once per visit (this browser tab's session), then the plaque just hangs.
  const [drop] = useState(() => {
    try {
      return typeof window !== "undefined" && !window.sessionStorage.getItem(DROPPED_KEY);
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!shown || !drop) return;
    try {
      window.sessionStorage.setItem(DROPPED_KEY, "1");
    } catch {}
  }, [shown, drop]);
  if (!pick && !greeting) return null;
  const event = pick?.event;
  const live = !!pick?.live;
  const pct = event ? (upTo[event.id] ?? 0) : 0;
  const left = event ? (live ? Date.parse(event.endsAt) : Date.parse(event.startsAt)) - now : 0;
  // The sale's background when a sale fills the plaque, else the greeting's (lib/plaque.ts).
  const background = (event ? event.background : greeting?.background) ?? "black";
  const frame = (event ? event.frame : greeting?.frame) ?? "gold";
  const label = event
    ? `${greeting ? `${greeting.message}. ` : ""}${live ? `${event.name}, up to ${pct}% off` : `${event.name} starts soon`}`
    : greeting!.message;

  return (
    <div
      aria-label={label}
      className={`sale-hang absolute inset-x-0 top-[calc(7rem+20px)] z-20 px-3 sm:px-margin drop-shadow-[0_8px_16px_rgba(0,0,0,0.45)]${drop ? " sale-drop" : ""}`}
      data-frame={frame === "gold" ? undefined : frame}
      role="region"
    >
      {/* Hung from two twisted golden ropes that come down from under the header
          (owner, 2026-11-18). On a first visit it drops, bounces and swings twice, then rests. */}
      <div aria-hidden="true" className="sale-ropes max-w-[1180px] mx-auto">
        <span className="sale-rope sale-rope-l" />
        <span className="sale-rope sale-rope-r" />
      </div>
      {/* An ornate plaque, after the owner's design: a gold frame with pointed, fleur-tipped
          ends and a crest, around a black damask panel (styles: globals.css .sale-plaque). */}
      <div className="sale-plaque max-w-[1180px] mx-auto text-[var(--pl-text)]" data-bg={background}>
        <span aria-hidden="true" className="pf pf-frame" />
        <span aria-hidden="true" className="pf pf-groove" />
        <span aria-hidden="true" className="pf pf-line" />
        <span aria-hidden="true" className="pf pf-panel">
          {/* The occasion's motif falling inside the panel only, behind the text; it goes with the plaque. */}
          <SalePetals motif={plaqueMotif(greeting?.style, event ? (event.motif ?? "general") : undefined)} />
        </span>
        <Fleur className="pf-tip pf-tip-l" />
        <Fleur className="pf-tip pf-tip-r" />
        {/* During a sale, a greeting rides on a small gold scroll where the crest sits. */}
        {event && greeting ? <GreetingScroll bg={greeting.scrollBg ?? "gold"} text={greeting.message} /> : <Crest />}
      {!event && greeting ? (
        // One line on every screen (owner, 2026-11-19): the greeting, its line (from sm: up, trimmed
        // with "…" when there isn't room; too cramped on phones), then the link.
        <div className="relative px-[calc(var(--p)+14px)] py-4 sm:py-4 flex items-center justify-center gap-x-2.5 sm:gap-x-5 min-w-0 whitespace-nowrap">
          <span className="shrink-0 font-headline-sm italic text-[17px] sm:text-[24px] leading-none text-[var(--pl-accent)]">{greeting.message}</span>
          {greeting.line && (
            <span className="hidden lg:block min-w-0 truncate font-body-sm text-[13px] leading-none text-[var(--pl-muted)]">{greeting.line}</span>
          )}
          {greeting.linkHref && greeting.linkLabel && (
            <Link
              className="shrink-0 link-draw [--draw-color:var(--pl-accent)] font-label-uppercase text-[9px] sm:text-[11px] uppercase tracking-[0.16em] sm:tracking-[0.24em] text-[var(--pl-accent)] whitespace-nowrap"
              href={greeting.linkHref}
            >
              {greeting.linkLabel} →
            </Link>
          )}
        </div>
      ) : event ? (
      // One line on every screen (owner, 2026-11-19): name and percent on the left, the link on the
      // right; a long name ends with "…" rather than wrapping. Phones keep the countdown in the corner.
      <div className="relative px-[calc(var(--p)+12px)] pt-6 pb-3.5 lg:py-4 flex items-center justify-between gap-x-3 sm:gap-x-space-md min-w-0 whitespace-nowrap">
        <p className="flex items-baseline gap-x-2 sm:gap-x-3 min-w-0">
          <span className="min-w-0 max-sm:truncate sm:shrink-0 font-headline-sm italic text-[15px] sm:text-[18px] md:text-[22px] leading-none text-[var(--pl-accent)]">{event.name}</span>
          <span className="shrink-0 font-label-uppercase text-[9px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.24em]">
            {live ? `Up to ${pct}% off` : "Coming soon"}
            {event.headline ? <span className="hidden xl:inline"> · {event.headline}</span> : null}
          </span>
        </p>
        <div className="shrink-0 flex items-center gap-space-md">
          {(event.countdown || !live) && left > 0 ? (
            // Below 1024 px: a micro countdown pinned to the plaque's top-right corner, so the name always fits.
            <span className="font-label-uppercase uppercase text-[var(--pl-muted)] lg:text-[11px] lg:tracking-[0.2em] tabular-nums max-lg:absolute max-lg:top-[11px] max-lg:right-[calc(var(--p)+10px)] max-lg:text-[7.5px] sm:max-lg:text-[8.5px] max-lg:tracking-[0.16em] max-lg:leading-none">
              {live ? "Ends in" : "Starts in"} <span className="text-[var(--pl-accent)]">{countdown(left)}</span>
            </span>
          ) : (
            <span className="font-label-uppercase uppercase text-[var(--pl-muted)] lg:text-[11px] lg:tracking-[0.2em] max-lg:absolute max-lg:top-[11px] max-lg:right-[calc(var(--p)+10px)] max-lg:text-[7.5px] sm:max-lg:text-[8.5px] max-lg:tracking-[0.16em] max-lg:leading-none">
              {live ? `Until ${saleTime(event.endsAt)}` : `From ${saleTime(event.startsAt)}`}
            </span>
          )}
          {live && (
            <Link
              className="link-draw [--draw-color:var(--pl-accent)] font-label-uppercase text-[9px] sm:text-[11px] uppercase tracking-[0.14em] sm:tracking-[0.24em] text-[var(--pl-accent)] whitespace-nowrap"
              href="/collections?sale=1"
            >
              {event.ctaLabel?.trim() || "Shop the Sale"} →
            </Link>
          )}
        </div>
      </div>
      ) : null}
      </div>
    </div>
  );
}

/** The greeting's gold scroll at the top centre of the sale plaque (globals.css `.pf-scroll`). */
function GreetingScroll({ text, bg }: { text: string; bg: string }) {
  return (
    <span aria-hidden="true" className="pf-scroll" data-bg={bg === "gold" ? undefined : bg}>
      {/* With a background, the fill sits inside a fine gold edge (globals.css `.pf-scroll[data-bg]`). */}
      {bg !== "gold" && <span className="pf-scroll-fill" />}
      <span className="pf-scroll-text">{text}</span>
    </span>
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
        {/* The frame finish's colours (globals.css [data-frame]); gold by default. */}
        <stop offset="0" style={{ stopColor: "var(--fr-line, #f8e7ae)" }} />
        <stop offset="0.45" style={{ stopColor: "var(--fr-base, #c99a49)" }} />
        <stop offset="0.7" style={{ stopColor: "var(--fr-deep, #8e6a2c)" }} />
        <stop offset="1" style={{ stopColor: "var(--fr-hi2, #f1d88e)" }} />
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
      <g fill={`url(#${id})`} strokeWidth="0.7" style={{ stroke: "var(--fr-ink, #5a3f12)" }}>
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
      <g fill="url(#crest)" strokeWidth="0.6" style={{ stroke: "var(--fr-ink, #5a3f12)" }}>
        <path d="M40 1 C43 6 46 8 40 15 C34 8 37 6 40 1 Z" />
        <path d="M38 13 C30 6 20 7 14 12 C20 11 27 13 33 18 L40 21 L47 18 C53 13 60 11 66 12 C60 7 50 6 42 13 L40 15 Z" />
        <circle cx="12" cy="13" r="2" />
        <circle cx="68" cy="13" r="2" />
      </g>
    </svg>
  );
}

function SalePetals({ motif }: { motif: SaleMotif }) {
  if (motif === "none") return null;
  return (
    <div aria-hidden="true" className="sale-petals">
      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`sale-petal${p.wide ? " hidden sm:block" : ""}`}
          style={{ "--x": p.x, "--s": `${p.s}px`, "--t": `${p.t}s`, "--d": `${p.d}s`, "--w": `${p.w}px` } as React.CSSProperties}
        >
          <span>
            {motif === "general" ? <TinyRose i={i} /> : <OccasionMotif i={i} motif={motif} />}
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
  const { events, greetings, now } = useSaleClock();
  const pick = now === null ? null : featuredSale(events, upTo, now);
  const greeting = now === null ? null : liveGreeting(greetings, now);
  // A live greeting leads, then a live sale, then the usual announcements.
  const messages = [
    ...(greeting ? [`${greeting.message} from R'ose Atelier`] : []),
    ...(pick?.live ? [`${pick.event.name} · Up to ${upTo[pick.event.id]}% off · Until ${saleTime(pick.event.endsAt)}`] : []),
    ...announcements,
  ];
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

/** A tiny rose seen from above, in the home silk's champagne and gold (General, and every sale). */
function TinyRose({ i }: { i: number }) {
  return (
    <>
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
    </>
  );
}

/**
 * The falling motif for an occasion (lib/greetings.ts): Eid, crescents and
 * stars; Ramadan, lanterns and stars; Independence Day, stars in gold and
 * green. Solid fills, no gradient ids, since several share the panel.
 */
function OccasionMotif({ motif, i }: { motif: Exclude<SaleMotif, "general" | "none">; i: number }) {
  const gold = { fill: "#e2c27d", stroke: "#8c6a2f", strokeWidth: 0.6 };
  const star = <path d="M12 2.5l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5Z" {...gold} />;
  let shape: React.ReactNode = star;
  if (motif === "eid" && i % 2 === 0) {
    shape = <path d="M15.5 3.2a9 9 0 1 0 5.6 15.4A7.4 7.4 0 1 1 15.5 3.2Z" {...gold} />;
  } else if (motif === "ramadan" && i % 2 === 0) {
    shape = (
      <g {...gold}>
        <path d="M12 1.6a1.3 1.3 0 0 1 1.3 1.3v1.2h-2.6V2.9A1.3 1.3 0 0 1 12 1.6Z" />
        <path d="M8.3 4.6h7.4l1.1 2.1H7.2Z" />
        <path d="M7.6 7.2h8.8l-.8 10.6a1.8 1.8 0 0 1-1.8 1.7h-3.6a1.8 1.8 0 0 1-1.8-1.7Z" />
        <path d="M9.2 20.2h5.6v1.6H9.2Z" />
        <path d="M12 9.5c1.3 1.5 1.3 4.6 0 6.6-1.3-2-1.3-5.1 0-6.6Z" fill="#fff6dc" stroke="none" />
      </g>
    );
  } else if (motif === "winter") {
    // A six-armed snowflake, in frosty white.
    shape = (
      <g fill="none" stroke="var(--pl-snow, #eef4fb)" strokeLinecap="round" strokeWidth={1.3}>
        {[0, 60, 120].map((a) => (
          <g key={a} transform={`rotate(${a} 12 12)`}>
            <path d="M12 2.5v19" />
            <path d="M9.6 4.6 12 7l2.4-2.4M9.6 19.4 12 17l2.4 2.4" />
          </g>
        ))}
      </g>
    );
  } else if (motif === "summer") {
    // A small sun: a gold disc and rays.
    shape = (
      <g>
        <g stroke="#e8b84a" strokeLinecap="round" strokeWidth={1.4}>
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
            <path key={a} d="M12 2.6v2.6" transform={`rotate(${a} 12 12)`} />
          ))}
        </g>
        <circle cx="12" cy="12" fill="#f3cf6b" r="4.6" stroke="#b9862f" strokeWidth={0.6} />
      </g>
    );
  } else if (motif === "autumn") {
    // A falling leaf, amber and rust in turn.
    shape = (
      <g>
        <path d="M12 2.5c4.6 3.2 7 7.2 6.2 11.4-.7 3.6-3.4 6-6.2 7.6-2.8-1.6-5.5-4-6.2-7.6C5 9.7 7.4 5.7 12 2.5Z" fill={i % 2 ? "#b8552a" : "#d99a3b"} stroke="#7a3a17" strokeWidth={0.6} />
        <path d="M12 6v16M12 11l3-2.4M12 15l-3-2.4" fill="none" stroke="#7a3a17" strokeOpacity={0.7} strokeWidth={0.7} />
      </g>
    );
  } else if (motif === "spring") {
    // A five-petal blossom, soft pink with a gold heart.
    shape = (
      <g>
        {[0, 72, 144, 216, 288].map((a) => (
          <ellipse key={a} cx="12" cy="7" fill="#f6c9d2" rx="3.2" ry="4.4" stroke="#d98ea0" strokeWidth={0.5} transform={`rotate(${a} 12 12)`} />
        ))}
        <circle cx="12" cy="12" fill="#e8c46a" r="1.9" />
      </g>
    );
  } else if (motif === "independence" && i % 2 === 1) {
    shape = <path d="M12 2.5l2.4 5.6 6.1.5-4.6 4 1.4 6-5.3-3.2-5.3 3.2 1.4-6-4.6-4 6.1-.5Z" fill="#2f7d4c" stroke="#e2c27d" strokeWidth={0.8} />;
  }
  return (
    <svg data-motif={motif} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      {shape}
    </svg>
  );
}
