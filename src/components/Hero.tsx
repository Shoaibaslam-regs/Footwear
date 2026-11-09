import Link from "next/link";
import { getSiteSettings } from "@/lib/server/settings";
import HeroSlideshow from "./HeroSlideshow";

export default async function Hero() {
  const { heroSlides } = await getSiteSettings();
  return (
    <section className="relative w-full -mt-28 min-h-[942px] flex items-end justify-start overflow-hidden bg-primary-container">
      <HeroSlideshow slides={heroSlides.map((s) => ({ image: s.url, alt: s.alt }))} />
      {/* Atmospheric Gradients & Scrim */}
      <div className="absolute inset-0 bg-linear-to-t/srgb from-primary via-primary/40 to-transparent pointer-events-none" />
      <div className="absolute inset-0 bg-linear-to-r/srgb from-primary/80 via-primary/30 to-transparent pointer-events-none" />

      <div className="relative z-10 w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-44 pb-space-xl flex flex-col items-start gap-space-lg">
        {/* Atelier Badges */}
        <div className="flex flex-wrap items-center gap-space-sm">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface/10 backdrop-blur-md rounded-full font-label-uppercase text-label-uppercase text-secondary-fixed uppercase tracking-widest shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary-fixed animate-pulse" />
            Handcrafted in Tuscany
          </span>
          <span className="inline-flex items-center px-3 py-1 bg-tertiary-container/60 backdrop-blur-md rounded-full font-label-uppercase text-label-uppercase text-tertiary-fixed tracking-widest uppercase shadow-sm">
            Limited Atelier Edition
          </span>
        </div>

        {/* Hero Typography */}
        <div className="max-w-3xl flex flex-col gap-space-sm">
          <p className="font-label-uppercase text-label-uppercase uppercase tracking-[0.25em] text-secondary-fixed">
            Spring / Summer 2025 Atelier
          </p>
          <h1 className="font-headline-lg text-headline-lg lg:text-display-hero text-surface-container-lowest font-normal tracking-tight leading-none drop-shadow-md">
            Elegance In Every Step
          </h1>
          <p className="font-body-lg text-body-lg text-primary-fixed max-w-xl font-light leading-relaxed">
            Discover sculptural footwear handcrafted in Italy to elevate every
            silhouette—where ergonomic mastery meets haute-couture architecture.
          </p>
        </div>

        {/* Dual CTAs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-space-md pt-space-xs w-full sm:w-auto">
          <Link
            className="h-[52px] px-8 rounded-full bg-primary-container text-secondary-fixed hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl group"
            href="/collections"
          >
            <span>Explore Collection</span>
            <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
              arrow_forward
            </span>
          </Link>
          <a
            className="h-[52px] px-8 rounded-full bg-surface-container-lowest/15 backdrop-blur-md text-surface-container-lowest hover:bg-surface-container-lowest hover:text-primary transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center shadow-md"
            href="#new-arrivals"
          >
            Discover New Arrivals
          </a>
        </div>

        {/* Micro Metric Bar */}
        <div className="flex items-center gap-space-xl pt-space-sm text-surface-dim font-label-uppercase text-label-uppercase">
          <div className="flex items-center gap-2">
            <span className="text-secondary-fixed">01</span>
            <span className="tracking-widest">FLORENTINE SOLE</span>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-secondary-fixed">02</span>
            <span className="tracking-widest">ARCHITECTURAL HEEL</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="text-secondary-fixed">03</span>
            <span className="tracking-widest">NAPPA MEMORY FOAM</span>
          </div>
        </div>
      </div>
    </section>
  );
}
