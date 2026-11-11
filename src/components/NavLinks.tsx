"use client";

import Link from "next/link";
import { navLinks } from "@/lib/data";
import { useActiveNav } from "./header/useActiveNav";

const base =
  "relative py-1 font-label-uppercase text-label-uppercase uppercase transition-colors tracking-widest";
const idle = "text-on-surface-variant hover:text-on-surface";
const active = "text-on-surface";
/** Gold bar under the current link; it grows in from the centre. */
const bar =
  "pointer-events-none absolute left-0 right-0 -bottom-1.5 h-0.5 rounded-full bg-secondary origin-center transition-transform duration-300";

export default function NavLinks() {
  const current = useActiveNav();

  return (
    <nav aria-label="Main" className="hidden lg:flex items-center gap-space-lg">
      {navLinks.map((link) => {
        const isActive = current === link.href;
        return (
          <Link
            key={link.label}
            aria-current={isActive ? "page" : undefined}
            className={`${base} ${isActive ? active : idle}`}
            href={link.href}
          >
            {link.label}
            <span aria-hidden="true" className={`${bar} ${isActive ? "scale-x-100" : "scale-x-0"}`} />
          </Link>
        );
      })}
    </nav>
  );
}

/** Prerendered placeholder shown until the current path is known. */
export function NavLinksFallback() {
  return (
    <nav aria-label="Main" className="hidden lg:flex items-center gap-space-lg">
      {navLinks.map((link) => (
        <Link key={link.label} className={`${base} ${idle}`} href={link.href}>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
