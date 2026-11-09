import Link from "next/link";

/** Switches between a listing's Insights and Edit pages. */
export default function ListingTabs({ id, current }: { id: string; current: "insights" | "edit" }) {
  return (
    <nav aria-label="Listing" className="flex gap-1 rounded-full bg-[var(--a-panel)] border border-[var(--a-line)] p-1 w-fit">
      <Link aria-current={current === "insights" ? "page" : undefined} className="pill" href={`/admin/products/${id}/insights`}>
        Insights
      </Link>
      <Link aria-current={current === "edit" ? "page" : undefined} className="pill" href={`/admin/products/${id}`}>
        Edit
      </Link>
    </nav>
  );
}
