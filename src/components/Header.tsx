import Image from "next/image";
import Link from "next/link";
import { getSiteSettings } from "@/lib/server/settings";
import { toSearchEntry } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import { Suspense } from "react";
import NavLinks, { NavLinksFallback } from "./NavLinks";
import HeaderActions from "./header/HeaderActions";
import MobileMenu from "./header/MobileMenu";
import { Announcements } from "./sale/SaleBanner";
import { saleUpTo } from "@/lib/server/sale-events";

export default async function Header() {
  const [listings, { announcements }, upTo] = await Promise.all([getPublishedProducts(), getSiteSettings(), saleUpTo()]);
  const searchIndex = listings.map(toSearchEntry);
  return (
    <header className="shop-chrome fixed top-0 inset-x-0 z-50 transition-all duration-300">
      <div className="w-full bg-primary text-on-primary py-space-xs overflow-hidden select-none">
        {/* While a sale is live, its message leads (components/sale/SaleBanner.tsx). */}
        <Announcements announcements={announcements} upTo={upTo} />
      </div>
      <div className="site-bar w-full bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-20 max-w-[1536px] mx-auto px-margin-mobile lg:px-margin flex items-center justify-between">
          <Suspense fallback={<NavLinksFallback />}>
            <NavLinks />
          </Suspense>
          <MobileMenu />
          <div className="flex items-center justify-center">
            <Link aria-label="Ŕose Atelier, home" className="flex items-center gap-1.5 sm:gap-2.5 group" href="/">
              {/* The site icon (src/app/icon.png), before the name. */}
              <Image
                alt=""
                className="w-7 h-7 sm:w-9 sm:h-9 object-contain transition-transform duration-300 group-hover:-rotate-6 motion-reduce:transition-none"
                height={36}
                priority
                src="/icon.png"
                width={36}
              />
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
