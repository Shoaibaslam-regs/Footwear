/**
 * Home page type styles, shared by every section so they read as one voice.
 * Small, widely spaced eyebrows; large serif headings with tight tracking and
 * one italic gold accent word; prices light, never bold.
 * Eyebrows are block-level so the slide-up reveal (a transform) applies to them.
 */
export const eyebrow = "block font-label-uppercase text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.32em] text-secondary";
export const sectionTitle =
  "font-headline-lg text-[30px] leading-[1.08] sm:text-[42px] lg:text-[52px] tracking-[-0.02em] font-normal text-primary text-balance";
/** The italic accent inside a heading: <em className={accent}>Arrivals</em> */
export const accent = "italic text-secondary";
/** Light price text for cards. */
export const quietPrice = "font-body-md text-[13px] sm:text-[15px] font-normal tracking-wide text-primary tabular-nums";

/**
 * One rhythm for every home section (owner, 2026-11-18: "more premium"):
 * the same generous space above and below each section, the same gap under
 * its heading, and one "View all" link style. Change it here, not per section.
 */
export const sectionY = "py-14 sm:py-20 lg:py-24";
export const sectionHead = "mb-8 sm:mb-12 lg:mb-14";
export const viewAll =
  "link-draw shrink-0 pb-1 font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.24em] text-primary whitespace-nowrap";
