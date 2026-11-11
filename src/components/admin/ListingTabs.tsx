import Link from "next/link";

/** Switches between a listing's Insights and Edit pages. */
export default function ListingTabs({ id, current }: { id: string; current: "insights" | "edit" }) {
  return (
    <nav aria-label="Listing" className="a-seg w-fit">
      <Link aria-current={current === "insights" ? "page" : undefined} className="pill" href={`/admin/products/${id}/insights`}>
        Insights
      </Link>
      <Link aria-current={current === "edit" ? "page" : undefined} className="pill" href={`/admin/products/${id}`}>
        Edit
      </Link>
    </nav>
  );
}
