import Link from "next/link";
import { footerColumns, whatsappUrl } from "@/lib/data";
import SizeGuideLink from "./SizeGuideLink";
import FooterCurrency from "./FooterCurrency";

/** Only true promises, each one something the shop already does (see the policy pages). */
const promises = [
  { icon: "payments", title: "Cash on Delivery", text: "Pay when your parcel arrives, anywhere in Pakistan." },
  { icon: "autorenew", title: "14-Day Exchange", text: "Exchange or return a pair within 14 days of delivery." },
  { icon: "chat", title: "Sizing Help", text: "Not sure about your size? Ask us on WhatsApp." },
];

/**
 * A dark espresso footer (owner, 2026-11-19: premium but calm): the brand and a
 * WhatsApp button, three real promises, the link columns and a slim bottom line.
 * Champagne text, gold only on fine lines, small headings and icons; the large
 * faint R'OSE wordmark closes the page.
 * The newsletter form stays out until it is connected (CLAUDE.md, Open work).
 */
export default function Footer() {
  const line = "border-[#c9a35b]/15";
  return (
    <footer className="shop-chrome w-full bg-primary-container text-[#cfc2b4] mt-space-xl">
      <div aria-hidden="true" className="h-px bg-gradient-to-r from-transparent via-[#c9a35b]/55 to-transparent" />
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-12 sm:pt-16 pb-6">
        {/* Brand and the one action that matters: talk to us. */}
        <div className={`flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-10 sm:pb-12 border-b ${line}`}>
          <div>
            <p className="font-headline-lg font-normal text-[30px] sm:text-[40px] leading-none tracking-[0.18em] text-[#f3ece4]">R&apos;OSE ATELIER</p>
            <p className="mt-3 font-body-sm text-[13px] sm:text-[14px] leading-relaxed text-[#b8ab9d] max-w-md">
              Women&apos;s footwear from Karachi, made to look elegant and feel comfortable.
            </p>
          </div>
          <a
            className="self-start sm:self-auto inline-flex items-center gap-2.5 h-11 px-5 border border-[#c9a35b]/50 text-[#f6dfc1] hover:bg-[#c9a35b] hover:text-primary hover:border-[#c9a35b] transition-colors font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.22em] whitespace-nowrap"
            href={whatsappUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[17px]">
              chat
            </span>
            WhatsApp 0314 8428115
          </a>
        </div>

        {/* Real promises */}
        <ul className={`grid grid-cols-1 sm:grid-cols-3 border-b ${line}`}>
          {promises.map((p, i) => (
            <li
              key={p.title}
              className={`flex items-start gap-4 py-6 sm:py-8 sm:px-6 lg:px-8 first:sm:pl-0 ${i > 0 ? `border-t sm:border-t-0 sm:border-l ${line}` : ""}`}
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[22px] text-[#c9a35b] mt-0.5">
                {p.icon}
              </span>
              <span className="flex flex-col gap-1">
                <span className="font-label-uppercase text-[11px] uppercase tracking-[0.2em] text-[#f3ece4]">{p.title}</span>
                <span className="font-body-sm text-[13px] leading-relaxed text-[#b8ab9d]">{p.text}</span>
              </span>
            </li>
          ))}
        </ul>

        {/* Links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-gutter gap-y-9 py-10 sm:py-12">
          {footerColumns.map((col) => (
            <div key={col.title} className="flex flex-col gap-4">
              <h3 className="font-label-uppercase text-[10px] sm:text-[11px] text-[#c9a35b] uppercase tracking-[0.22em] font-semibold">{col.title}</h3>
              <ul className="flex flex-col gap-2.5 font-body-sm text-[13px] sm:text-[14px]">
                {col.links.map((link) => (
                  <li key={link.label}>
                    {link.sizeGuide ? (
                      <SizeGuideLink className="hover:text-[#f6dfc1] transition-colors text-left">{link.label}</SizeGuideLink>
                    ) : link.href ? (
                      <Link className="hover:text-[#f6dfc1] transition-colors" href={link.href}>
                        {link.label}
                      </Link>
                    ) : (
                      <span className="opacity-50">{link.label}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom line */}
        <div className={`pt-6 border-t ${line} flex flex-col-reverse sm:flex-row items-center justify-between gap-4 font-label-uppercase text-[10px] sm:text-[11px] text-[#9c8f82]`}>
          <span className="tracking-[0.14em] text-center">© R&apos;OSE ATELIER · KARACHI, PAKISTAN</span>
          <FooterCurrency />
        </div>
      </div>

      {/* The brand, large and faint, closing the page. */}
      <div aria-hidden="true" className="overflow-hidden select-none">
        <p className="font-headline-lg font-normal text-[#c9a35b]/[0.09] text-center leading-[0.8] tracking-[0.1em] text-[clamp(72px,21vw,300px)] translate-y-[6%]">
          R&apos;OSE
        </p>
      </div>
    </footer>
  );
}
