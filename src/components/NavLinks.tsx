"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navLinks } from "@/lib/data";

const base =
  "font-label-uppercase text-label-uppercase uppercase transition-colors tracking-widest";
const idle = "text-on-surface-variant hover:text-on-surface";
const active = "text-on-surface underline underline-offset-8 decoration-secondary";

export default function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="hidden lg:flex items-center gap-space-lg">
      {navLinks.map((link) => {
        const prefixes: readonly string[] =
          "activePrefixes" in link ? (link.activePrefixes ?? []) : [];
        const isActive = prefixes.some((p) => pathname.startsWith(p));
        return (
          <Link
            key={link.label}
            aria-current={isActive ? "page" : undefined}
            className={`${base} ${isActive ? active : idle}`}
            href={link.href}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Prerendered placeholder shown until the current path is known. */
export function NavLinksFallback() {
  return (
    <nav className="hidden lg:flex items-center gap-space-lg">
      {navLinks.map((link) => (
        <Link key={link.label} className={`${base} ${idle}`} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
