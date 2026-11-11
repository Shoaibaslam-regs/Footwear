import Link from "next/link";
import { footerColumns } from "@/lib/data";
import SizeGuideLink from "./SizeGuideLink";
import FooterCurrency from "./FooterCurrency";

const payments = ["CASH ON DELIVERY", "EASYPAISA", "JAZZCASH", "BANK TRANSFER", "VISA", "MASTERCARD"];

export default function Footer() {
  return (
    <footer className="shop-chrome w-full bg-surface-container-low text-on-surface mt-space-xl border-t border-outline-variant/30">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-xl pb-space-lg">
        <div className="pb-space-xl mb-space-xl border-b border-outline-variant/20 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="max-w-xl">
            <p className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em] mb-space-xs">
              Newsletter
            </p>
            <h2 className="font-headline-md text-headline-md text-primary font-normal tracking-tight">
              Get News & Offers by Email
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
              Be the first to see new collections, special invitations and early
              offers.
            </p>
          </div>
          <form className="w-full lg:max-w-md flex flex-col sm:flex-row gap-space-xs items-stretch">
            <div className="relative flex-1">
              <input
                id="newsletter-email"
                className="w-full h-[52px] bg-surface-container-lowest px-space-md text-on-surface placeholder:text-outline font-body-sm text-body-sm rounded-none border border-outline-variant/60 focus:border-primary focus:outline-none transition-colors"
                placeholder="Enter your email address"
                required
                type="email"
              />
              <label htmlFor="newsletter-email" className="sr-only">
                Email Address
              </label>
            </div>
            <button
              className="h-[52px] px-space-lg bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed font-label-uppercase text-label-uppercase uppercase tracking-widest transition-all duration-300 flex items-center justify-center"
              type="submit"
            >
              Subscribe
            </button>
          </form>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter lg:gap-space-xl pb-space-xl">
          {footerColumns.map((col) => (
            <div key={col.title} className="flex flex-col gap-space-sm">
              <h3 className="font-label-uppercase text-label-uppercase text-primary uppercase tracking-[0.16em] font-semibold mb-space-xs">
                {col.title}
              </h3>
              <ul className="flex flex-col gap-space-xs font-body-sm text-body-sm text-on-surface-variant">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.sizeGuide ? (
                      <SizeGuideLink className="hover:text-on-surface transition-colors text-left">
                        {link.label}
                      </SizeGuideLink>
                    ) : link.href ? (
                      <Link
                        className="hover:text-on-surface transition-colors"
                        href={link.href}
                      >
                        {link.label}
                      </Link>
                    ) : (
                      <span className="text-outline">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="pt-space-lg border-t border-outline-variant/30 flex flex-col md:flex-row items-center justify-between gap-space-md font-label-uppercase text-label-uppercase text-outline">
          <div className="flex items-center gap-space-sm flex-wrap justify-center md:justify-start">
            <span className="tracking-wider">
              © ŔOSE ATELIER. ALL RIGHTS RESERVED.
            </span>
            <span className="hidden md:inline">•</span>
            <span className="tracking-wider uppercase">
              Karachi
            </span>
          </div>
          <div className="w-full md:w-auto flex flex-col sm:flex-row flex-wrap items-center justify-center md:justify-end gap-space-sm">
            <FooterCurrency />
            <div className="flex flex-wrap items-center justify-center gap-space-xs text-[10px] tracking-wider text-on-surface-variant uppercase font-semibold">
              {payments.map((p) => (
                <span
                  key={p}
                  className="px-2 py-1 bg-surface-container-highest rounded-none"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
