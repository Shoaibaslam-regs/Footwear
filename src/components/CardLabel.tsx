/**
 * The single label on a shoe card (shop and home), one of the fixed list
 * (`CARD_LABELS` / `cardLabel` in lib/products.ts). A soft ivory tag with dark
 * text and a fine gold edge (owner, 2026-11-18), so it reads at a glance but
 * leaves the gold sale plaques as the eye-catcher.
 */
export default function CardLabel({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span className="absolute top-2 left-2 z-10 max-w-[calc(100%-3.25rem)] truncate px-2 py-1 bg-surface-container-lowest/85 backdrop-blur-sm text-primary border border-[#c99a49]/55 shadow-[0_1px_4px_rgba(0,0,0,0.08)] font-label-uppercase text-[9px] sm:text-[10px] font-medium leading-none uppercase tracking-[0.16em]">
      {label}
    </span>
  );
}
