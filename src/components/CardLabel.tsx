/**
 * The single label on a shoe card (shop and home), e.g. "Best Seller", "New"
 * or a badge set in the admin (see `cardLabel` in lib/products.ts). Small
 * espresso and gold, so it reads at a glance without crowding the photo.
 */
export default function CardLabel({ label }: { label?: string }) {
  if (!label) return null;
  return (
    <span className="absolute top-2 left-2 z-10 max-w-[calc(100%-3.25rem)] truncate px-2 py-1 bg-primary text-secondary-fixed font-label-uppercase text-[9px] sm:text-[10px] leading-none uppercase tracking-[0.16em]">
      {label}
    </span>
  );
}
