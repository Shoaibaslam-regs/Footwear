"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Listings" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

/** Sidebar nav: a vertical list on desktop, a sideways-scrolling row on phones. */
function NavList({ pathname }: { pathname: string | null }) {
  const ref = useRef<HTMLElement>(null);
  // Phones: bring the current page into view in the sideways-scrolling row.
  useEffect(() => {
    const nav = ref.current;
    const active = nav?.querySelector<HTMLElement>('[aria-current="page"]');
    if (nav && active && nav.scrollWidth > nav.clientWidth) {
      nav.scrollTo({ left: active.offsetLeft - nav.clientWidth / 2 + active.clientWidth / 2 });
    }
  }, [pathname]);
  return (
    <nav ref={ref} aria-label="Admin" className="flex md:flex-col gap-1 overflow-x-auto [scrollbar-width:none] -mx-1 px-1 py-1">
      {links.map((l) => {
        const active = pathname !== null && (l.exact ? pathname === l.href : pathname.startsWith(l.href));
        return (
          <Link key={l.href} aria-current={active ? "page" : undefined} className="a-side-link" href={l.href}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AdminNav() {
  return <NavList pathname={usePathname()} />;
}

/** Prerendered placeholder shown until the current path is known. */
export function AdminNavFallback() {
  return <NavList pathname={null} />;
}
