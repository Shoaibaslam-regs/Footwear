import Link from "next/link";
import { Fragment } from "react";
import { getSiteSettings } from "@/lib/server/settings";
import HeroSlideshow from "./HeroSlideshow";
import SaleBanner from "./sale/SaleBanner";
import { saleUpTo } from "@/lib/server/sale-events";

export default async function Hero() {
  const [{ heroSlides }, upTo] = await Promise.all([getSiteSettings(), saleUpTo()]);
  // Phones: about half the screen (the fixed header overlaps its top). Tablet/desktop: tall editorial hero.
  return (
    <section className="relative w-full -mt-28 h-[56svh] min-h-[400px] max-h-[560px] sm:h-auto sm:max-h-none sm:min-h-[720px] lg:min-h-[100svh] flex items-end justify-start overflow-hidden bg-primary-container">
      <HeroSlideshow slides={heroSlides.map((s) => ({ image: s.url, alt: s.alt }))} />
      {/* While a sale is live: a highlighted band over the top of the hero, under the header. */}
      <SaleBanner upTo={upTo} />
      {/* Atmospheric Gradients & Scrim */}
      <div className="absolute inset-0 bg-linear-to-t/srgb from-primary via-primary/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-r/srgb from-primary/80 via-primary/30 to-transparent pointer-events-none" />

      {/* Lower left, small and calm: eyebrow, headline, one line, one button. */}
      <div className="relative z-10 w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-32 sm:pt-44 pb-space-xl sm:pb-24 flex flex-col items-start gap-space-md sm:gap-space-lg">
        <div className="max-w-2xl flex flex-col gap-space-sm sm:gap-space-md">
          <p
            className="hero-rise font-label-uppercase text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.36em] text-secondary-fixed"
            style={{ "--d": "160ms" } as React.CSSProperties}
          >
            Handmade in Karachi
          </p>
          <h1 className="font-headline-lg text-[38px] leading-[1.02] sm:text-[56px] lg:text-display-hero lg:leading-[1.02] text-surface-container-lowest font-normal tracking-[-0.025em] drop-shadow-md">
            {/* Word-by-word reveal from a mask (CSS only, see globals.css); the last two words in italic gold. */}
            {"Elegance In Every Step".split(" ").map((w, i) => (
              <Fragment key={w}>
                {i > 0 && " "}
                <span className="hero-word">
                  <span className={i >= 2 ? "italic text-secondary-fixed" : undefined} style={{ "--d": `${260 + i * 90}ms` } as React.CSSProperties}>
                    {w}
                  </span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p
            className="hero-rise hidden sm:block font-body-md text-body-md text-primary-fixed max-w-md font-light leading-relaxed"
            style={{ "--d": "640ms" } as React.CSSProperties}
          >
            Made by hand to look elegant and stay comfortable all day.
          </p>
        </div>

        <div className="hero-rise" style={{ "--d": "760ms" } as React.CSSProperties}>
          {/* Ivory outline that fills from the left on hover. */}
          <Link
            className="btn-fill h-11 sm:h-12 px-6 sm:px-9 ring-1 ring-inset ring-surface-container-lowest/80 text-surface-container-lowest font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.26em] inline-flex items-center gap-3 group [--fill:var(--color-surface-container-lowest)] [--fill-text:var(--color-primary)]"
            href="/collections"
          >
            Shop the Collection
            <span className="material-symbols-outlined text-[16px] transition-transform duration-300 group-hover:translate-x-1">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
