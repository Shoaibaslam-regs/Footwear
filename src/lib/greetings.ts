import type { PlaqueBg, PlaqueFrame } from "./plaque";

/**
 * Greetings: festive wishes such as "Eid Mubarak" or "Ramadan Kareem" shown
 * on the home page's hanging plaque (owner, 2026-11-18). Managed at
 * /admin/greetings. With no sale running, the greeting gets the whole plaque;
 * alongside a sale it sits on a small gold scroll above the sale plaque, and
 * its occasion picks the motif falling inside the panel. One at a time: if
 * greetings overlap, the most recently created one shows.
 */

export const GREETING_STYLES = ["eid", "ramadan", "independence", "general", "none"] as const;
export type GreetingStyle = (typeof GREETING_STYLES)[number];

export const greetingStyleLabel: Record<GreetingStyle, string> = {
  eid: "Eid (gold crescents and stars)",
  ramadan: "Ramadan (gold lanterns and stars)",
  independence: "Independence Day (gold and green stars)",
  general: "General (champagne roses)",
  none: "None (the sale's motif falls, or nothing)",
};

export type Greeting = {
  id: string;
  message: string;
  line: string;
  style: GreetingStyle;
  /** The plaque's background when the greeting shows alone (lib/plaque.ts); default black. */
  background?: PlaqueBg;
  /** The small scroll's fill when the greeting rides on a sale plaque: "gold" (default) or a plaque background. */
  scrollBg?: "gold" | PlaqueBg;
  /** The plaque's frame finish when the greeting shows alone; default gold. */
  frame?: PlaqueFrame;
  /** Optional link, e.g. "Shop the Eid Edit" → "/collections?category=bridal". */
  linkLabel: string;
  linkHref: string;
  startsAt: string;
  endsAt: string;
  stoppedAt: string | null;
  createdAt: string;
};

export type GreetingState = "scheduled" | "live" | "ended";

export function greetingState(g: Pick<Greeting, "startsAt" | "endsAt" | "stoppedAt">, now: number): GreetingState {
  if (g.stoppedAt && Date.parse(g.stoppedAt) <= now) return "ended";
  if (now < Date.parse(g.startsAt)) return "scheduled";
  return now < Date.parse(g.endsAt) ? "live" : "ended";
}

/** The greeting to show now: the most recently created live one. */
export function liveGreeting(list: Greeting[], now: number): Greeting | null {
  const live = list.filter((g) => greetingState(g, now) === "live");
  return live.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0] ?? null;
}

/** When the next greeting starts or ends, so the page switches at that moment. */
export function nextGreetingChange(list: Greeting[], now: number): number | null {
  let next: number | null = null;
  for (const g of list) {
    for (const t of [Date.parse(g.startsAt), Date.parse(g.endsAt)]) {
      if (t > now && (next === null || t < next)) next = t;
    }
  }
  return next;
}

/** Only links inside the shop ("/collections…"), never to another site. */
export const isShopLink = (href: string) => /^\/(?!\/)[\w\-./?=&%#]*$/.test(href);

/**
 * What falls inside the home plaque (owner, 2026-11-19): the greeting's motif,
 * unless it is "none", then the sale's; "none" on both (or a greeting set to
 * none with no sale) means nothing falls.
 */
export function plaqueMotif<M extends string>(greetingStyle: GreetingStyle | undefined, saleMotif: M | undefined): GreetingStyle | M | "none" {
  if (greetingStyle && greetingStyle !== "none") return greetingStyle;
  return saleMotif ?? "none";
}
