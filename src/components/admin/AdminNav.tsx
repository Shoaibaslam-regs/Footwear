"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Overview", exact: true },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Listings" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/settings", label: "Settings" },
];

export default function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-4">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            aria-current={active ? "page" : undefined}
            className={active ? "font-semibold" : "muted hover:text-[var(--a-text)]"}
            href={l.href}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Prerendered placeholder shown until the current path is known. */
export function AdminNavFallback() {
  return (
    <nav className="flex items-center gap-4">
      {links.map((l) => (
        <Link key={l.href} className="muted" href={l.href}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
