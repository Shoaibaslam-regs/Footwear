"use client";

import { usePathname } from "next/navigation";
import { onPath } from "./useActiveNav";

/**
 * Gold dot under a header icon when its page is open. Rendered inside
 * <Suspense> (it reads the pathname), so the icon itself stays prerendered.
 */
export default function ActiveMark({ href }: { href: string }) {
  const pathname = usePathname();
  if (!onPath(pathname, href)) return null;
  return (
    <>
      <span aria-hidden="true" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-secondary" />
      <span className="sr-only">(current page)</span>
    </>
  );
}
