"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/** 20px line icons in the Fluent style (1.5px strokes, rounded ends). */
const paths: Record<string, React.ReactNode> = {
  home: <path d="M3.5 9.5 10 4l6.5 5.5V16a1 1 0 0 1-1 1h-3.5v-4.5h-4V17H4.5a1 1 0 0 1-1-1V9.5Z" />,
  orders: (
    <>
      <path d="M5.5 3h9a1 1 0 0 1 1 1v13l-2-1.3-2 1.3-1.5-1-1.5 1-2-1.3-2 1.3V4a1 1 0 0 1 1-1Z" />
      <path d="M7.5 7h5M7.5 10h5M7.5 13h3" />
    </>
  ),
  listings: (
    <>
      <path d="M3.5 10.6V4.5a1 1 0 0 1 1-1h6.1a1 1 0 0 1 .7.3l5.4 5.4a1 1 0 0 1 0 1.4l-6.1 6.1a1 1 0 0 1-1.4 0l-5.4-5.4a1 1 0 0 1-.3-.7Z" />
      <circle cx="7.3" cy="7.3" r="1.1" />
    </>
  ),
  coupons: (
    <>
      <path d="M3 6.5a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v2a1.5 1.5 0 0 0 0 3v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a1.5 1.5 0 0 0 0-3v-2Z" />
      <path d="M12 5.5v9" strokeDasharray="1.5 1.5" />
    </>
  ),
  reviews: (
    <path d="m10 3.5 1.9 3.9 4.3.6-3.1 3 .7 4.3L10 13.3l-3.8 2 .7-4.3-3.1-3 4.3-.6L10 3.5Z" />
  ),
  users: (
    <>
      <circle cx="8" cy="7" r="2.8" />
      <path d="M3 16c.4-2.6 2.5-4.3 5-4.3s4.6 1.7 5 4.3" />
      <path d="M13.2 4.5a2.6 2.6 0 0 1 0 5M14.6 11.9c1.3.5 2.2 1.8 2.4 3.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="10" cy="10" r="2.5" />
      <path d="M10 2.8v2M10 15.2v2M4.9 4.9l1.4 1.4M13.7 13.7l1.4 1.4M2.8 10h2M15.2 10h2M4.9 15.1l1.4-1.4M13.7 6.3l1.4-1.4" />
    </>
  ),
};

function Icon({ name }: { name: string }) {
  return (
    <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} viewBox="0 0 20 20">
      {paths[name]}
    </svg>
  );
}

const links = [
  { href: "/admin", label: "Overview", icon: "home", exact: true },
  { href: "/admin/orders", label: "Orders", icon: "orders" },
  { href: "/admin/products", label: "Listings", icon: "listings" },
  { href: "/admin/coupons", label: "Coupons", icon: "coupons" },
  { href: "/admin/reviews", label: "Reviews", icon: "reviews" },
  { href: "/admin/users", label: "Users", icon: "users" },
  { href: "/admin/settings", label: "Settings", icon: "settings" },
];

/** Navigation pane: a vertical list on desktop, a sideways-scrolling row on phones. */
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
    <nav ref={ref} aria-label="Admin" className="flex md:flex-col gap-0.5 overflow-x-auto [scrollbar-width:none]">
      {links.map((l) => {
        const active = pathname !== null && (l.exact ? pathname === l.href : pathname.startsWith(l.href));
        return (
          <Link key={l.href} aria-current={active ? "page" : undefined} className="a-side-link" href={l.href}>
            <Icon name={l.icon} />
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
