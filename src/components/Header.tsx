import Link from "next/link";
import { getSiteSettings } from "@/lib/server/settings";
import { toSearchEntry } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import { Suspense } from "react";
import NavLinks, { NavLinksFallback } from "./NavLinks";
import HeaderActions from "./header/HeaderActions";
import MobileMenu from "./header/MobileMenu";

function AnnouncementGroup({ announcements, hidden }: { announcements: string[]; hidden?: boolean }) {
  return (
    <span
      className="flex items-center gap-space-md"
      aria-hidden={hidden ? "true" : undefined}
    >
      {announcements.map((text, i) => (
        <span key={`${i}-${text}`} className="contents">
          {(hidden || i > 0) && (
            <span className="text-outline text-[8px]">◆</span>
          )}
          <span>{text}</span>
        </span>
      ))}
    </span>
  );
}

export default async function Header() {
  const [listings, { announcements }] = await Promise.all([getPublishedProducts(), getSiteSettings()]);
  const searchIndex = listings.map(toSearchEntry);
  return (
    <header className="fixed top-0 inset-x-0 z-50 transition-all duration-300">
      <div className="w-full bg-primary text-on-primary py-space-xs overflow-hidden select-none">
        <div className="animate-marquee items-center gap-space-xl font-label-uppercase text-label-uppercase uppercase text-primary-fixed">
          <AnnouncementGroup announcements={announcements} />
          <AnnouncementGroup announcements={announcements} hidden />
        </div>
      </div>
      <div className="site-bar w-full bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-[1536px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
          <MobileMenu />
          <div className="flex items-center justify-center">
            <Link className="flex items-center group" href="/">
              <span className="font-headline-md text-[15px] leading-none tracking-[0.12em] min-[380px]:text-[17px] min-[380px]:tracking-[0.14em] sm:text-headline-md sm:tracking-[0.22em] uppercase text-primary font-normal whitespace-nowrap">
                R&apos;ose
              </span>
            </Link>
          </div>
          <div className="flex items-center gap-1 sm:gap-space-md">
            <HeaderActions searchIndex={searchIndex} />
          </div>
        </div>
      </div>
    </header>
  );
}
