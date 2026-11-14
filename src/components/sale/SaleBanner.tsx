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
      className="absolute inset-x-0 top-28 z-20 bg-primary/85 backdrop-blur-md border-y border-secondary-fixed/25 text-surface-container-lowest"
      role="region"
    >
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-2.5 sm:py-3 flex flex-wrap items-center justify-center sm:justify-between gap-x-space-md gap-y-1.5 text-center sm:text-left">
        <p className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-0.5">
          <span className="font-headline-sm italic text-[18px] sm:text-[22px] leading-none text-secondary-fixed">{event.name}</span>
          <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.24em]">
            {live ? `Up to ${pct}% off` : "Coming soon"}
            {event.headline ? <span className="hidden md:inline"> · {event.headline}</span> : null}
          </span>
        </p>
        <div className="flex items-center gap-space-md">
          {(event.countdown || !live) && left > 0 ? (
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80 tabular-nums">
              {live ? "Ends in" : "Starts in"} <span className="text-secondary-fixed">{countdown(left)}</span>
            </span>
          ) : (
            <span className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-surface-container-lowest/80">
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
