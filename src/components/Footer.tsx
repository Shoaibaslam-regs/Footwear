import Link from "next/link";
import { footerColumns } from "@/lib/data";
import SizeGuideLink from "./SizeGuideLink";
import FooterCurrency from "./FooterCurrency";

const payments = ["CASH ON DELIVERY"];

export default function Footer() {
  return (
    <footer className="shop-chrome w-full bg-surface-container-low text-on-surface mt-space-xl border-t border-outline-variant/30">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-xl pb-space-lg">
        <div className="pb-space-xl mb-space-xl border-b border-outline-variant/20 flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg">
          <div className="max-w-xl">
            <p className="font-label-uppercase text-[10px] sm:text-[11px] font-medium text-secondary uppercase tracking-[0.32em] mb-space-xs">
              Newsletter
            </p>
            <h2 className="font-headline-md text-[26px] sm:text-[32px] leading-tight text-primary font-normal tracking-[-0.02em]">
              Get News &amp; Offers <em className="italic text-secondary">by Email</em>
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-space-xs">
              Be the first to see new collections, special invitations and early
              offers.
            </p>
          </div>
          {/* One underlined line with an arrow, instead of a boxed form. */}
          <form className="w-full lg:max-w-md">
            <label htmlFor="newsletter-email" className="sr-only">
              Email Address
            </label>
            <div className="group flex items-center border-b border-primary/40 focus-within:border-primary transition-colors">
              <input
                id="newsletter-email"
                className="flex-1 min-w-0 h-12 bg-transparent px-0 text-on-surface placeholder:text-outline font-body-md text-body-md font-light focus:outline-none"
                placeholder="Email address"
                required
                type="email"
              />
              <button
                aria-label="Subscribe"
                className="h-12 pl-space-sm flex items-center gap-2 font-label-uppercase text-[10px] uppercase tracking-[0.26em] text-primary hover:text-secondary transition-colors"
                type="submit"
              >
                <span className="hidden sm:inline">Subscribe</span>
                <span aria-hidden="true" className="material-symbols-outlined text-[18px] transition-transform duration-300 group-focus-within:translate-x-1">
                  arrow_forward
                </span>
              </button>
            </div>
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

      {/* The brand, large and light, closing the page. */}
      <div aria-hidden="true" className="overflow-hidden select-none">
        <p className="font-headline-lg font-normal text-primary/[0.07] text-center leading-[0.8] tracking-[0.1em] text-[clamp(72px,21vw,300px)] translate-y-[6%]">
          ŔOSE
        </p>
      </div>
    </footer>
  );
}
