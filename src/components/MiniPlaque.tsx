/**
 * A miniature of the sale plaque (components/sale/SaleBanner.tsx) for the
 * small chips on shoe cards (owner, 2026-11-18): gold frame, dark groove, fine
 * gold line, a damask panel, pointed ends with fleur tips and a crest on top.
 * `dark` keeps the 12.12 tag's black panel, `champagne` the percent chip's.
 * Styles in globals.css `.mini-plaque`. Ornaments use solid fills (no SVG
 * gradient ids), since many chips share a page and some are hidden on phones.
 */
export default function MiniPlaque({
  tone,
  bg,
  frame,
  children,
  className = "",
}: {
  tone: "dark" | "champagne";
  /** The dark tag only: the sale's plaque background (lib/plaque.ts), in simplified colours. */
  bg?: string;
  /** The dark tag only: the sale's frame finish (lib/plaque.ts). */
  frame?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={`mini-plaque mini-plaque-${tone} ${className}`} data-bg={tone === "dark" && bg && bg !== "black" ? bg : undefined} data-frame={tone === "dark" && frame && frame !== "gold" ? frame : undefined}>
      <span aria-hidden="true" className="mp mp-frame" />
      <span aria-hidden="true" className="mp mp-groove" />
      <span aria-hidden="true" className="mp mp-line" />
      <span aria-hidden="true" className="mp mp-panel" />
      <MiniFleur side="l" />
      <MiniFleur side="r" />
      <svg aria-hidden="true" className="mp-crest" viewBox="0 0 24 8" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 0.4 C13.4 2.4 14.2 3.4 12 6.2 C9.8 3.4 10.6 2.4 12 0.4 Z M11 5.6 C8 3 4.6 3.4 2.4 5 C5 4.8 7.6 5.6 9.8 7.4 L12 7.8 L14.2 7.4 C16.4 5.6 19 4.8 21.6 5 C19.4 3.4 16 3 13 5.6 Z" />
      </svg>
      <span className="mp-text">{children}</span>
    </span>
  );
}

function MiniFleur({ side }: { side: "l" | "r" }) {
  return (
    <svg aria-hidden="true" className={`mp-tip mp-tip-${side}`} viewBox="0 0 12 12" xmlns="http://www.w3.org/2000/svg">
      <path d="M0.4 6 L4 4.8 L4 7.2 Z M4 6 C5.4 2.8 8 2.4 9.6 3.4 C8.2 3.8 6.8 4.8 5.8 6 C6.8 7.2 8.2 8.2 9.6 8.6 C8 9.6 5.4 9.2 4 6 Z" />
      <circle cx="3.9" cy="6" r="0.9" />
    </svg>
  );
}
