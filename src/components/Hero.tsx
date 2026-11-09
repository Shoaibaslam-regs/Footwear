import Link from "next/link";
import { Fragment } from "react";
import { getSiteSettings } from "@/lib/server/settings";
import HeroSlideshow from "./HeroSlideshow";

export default async function Hero() {
  const { heroSlides } = await getSiteSettings();
  // Phones: about half the screen (the fixed header overlaps its top). Tablet/desktop: tall editorial hero.
  return (
    <section className="relative w-full -mt-28 h-[56svh] min-h-[400px] max-h-[560px] sm:h-auto sm:max-h-none sm:min-h-[720px] lg:min-h-[942px] flex items-end justify-start overflow-hidden bg-primary-container">
      <HeroSlideshow slides={heroSlides.map((s) => ({ image: s.url, alt: s.alt }))} />
      {/* Atmospheric Gradients & Scrim */}
      <div className="absolute inset-0 bg-linear-to-t/srgb from-primary via-primary/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-r/srgb from-primary/80 via-primary/30 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-32 sm:pt-44 pb-space-xl flex flex-col items-start gap-space-md sm:gap-space-lg">
        {/* Badges */}
        <div className="hero-rise hidden sm:flex flex-wrap items-center gap-space-sm" style={{ "--d": "80ms" } as React.CSSProperties}>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/10 backdrop-blur-md rounded-full font-label-uppercase text-label-uppercase text-secondary-fixed uppercase tracking-widest shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse" />
            Handmade in Pakistan
          </span>
          <span className="inline-flex items-center px-3 py-1 bg-tertiary-container/60 backdrop-blur-md rounded-full font-label-uppercase text-label-uppercase text-tertiary-fixed tracking-widest uppercase shadow-sm">
            Limited Edition
          </span>
        </div>

        {/* Hero Typography */}
        <div className="max-w-3xl flex flex-col gap-space-sm">
          <p className="hero-rise font-label-uppercase text-label-uppercase uppercase tracking-[0.25em] text-secondary-fixed" style={{ "--d": "160ms" } as React.CSSProperties}>
            Spring / Summer Collection
          </p>
          <h1 className="font-headline-lg text-headline-lg-mobile sm:text-headline-lg lg:text-display-hero text-surface-container-lowest font-normal tracking-tight leading-none drop-shadow-md">
            {/* Word-by-word reveal from a mask (CSS only, see globals.css) */}
            {"Elegance In Every Step".split(" ").map((w, i) => (
              <Fragment key={w}>
                {i > 0 && " "}
                <span className="hero-word">
                  <span style={{ "--d": `${260 + i * 90}ms` } as React.CSSProperties}>{w}</span>
                </span>
              </Fragment>
            ))}
          </h1>
          <p style={{ "--d": "640ms" } as React.CSSProperties} className="hero-rise hidden sm:block font-body-lg text-body-lg text-primary-fixed max-w-xl font-light leading-relaxed">
            Beautiful shoes, handmade in Pakistan. Designed to look elegant and
            stay comfortable all day.
          </p>
        </div>

        {/* Dual CTAs */}
        <div className="hero-rise flex flex-row items-stretch sm:items-center gap-space-sm sm:gap-space-md sm:pt-space-xs w-full sm:w-auto" style={{ "--d": "760ms" } as React.CSSProperties}>
          <Link
            className="flex-1 sm:flex-none h-11 sm:h-[52px] px-4 sm:px-8 text-[11px] sm:text-label-uppercase rounded-full bg-primary-container text-secondary-fixed hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl group whitespace-nowrap"
            href="/collections"
          >
            <span>Shop Now</span>
            <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
          <a
            className="flex-1 sm:flex-none h-11 sm:h-[52px] px-4 sm:px-8 text-[11px] sm:text-label-uppercase rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-surface-container-lowest hover:bg-surface-container-lowest hover:text-primary transition-all duration-300 font-label-uppercase uppercase tracking-widest flex items-center justify-center shadow-md whitespace-nowrap"
            href="#new-arrivals"
          >
            <span className="sm:hidden">New Arrivals</span>
            <span className="hidden sm:inline">See New Arrivals</span>
          </a>
        </div>

        {/* Micro Metric Bar */}
        <div style={{ "--d": "900ms" } as React.CSSProperties} className="hero-rise hidden sm:flex items-center gap-space-xl pt-space-sm text-surface-dim font-label-uppercase text-label-uppercase">
          <div className="flex items-center gap-2">
            <span className="text-secondary-fixed">01</span>
            <span className="tracking-widest">ITALIAN LEATHER SOLE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-secondary-fixed">02</span>
            <span className="tracking-widest">BALANCED HEEL</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-secondary-fixed">03</span>
            <span className="tracking-widest">SOFT MEMORY FOAM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
