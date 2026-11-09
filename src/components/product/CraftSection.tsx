import Image from "next/image";
import { craftImage } from "@/lib/product-data";

export default function CraftSection() {
  return (
    <section className="w-full bg-surface-container-low py-space-xl my-space-lg">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter lg:gap-space-xl items-center">
          <div className="lg:col-span-5 space-y-space-md">
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              The Architectural Last
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight font-normal">
              Designed for 8 Hours of Weightless Grace.
            </h2>
            <p className="font-body-lg text-body-lg text-on-surface-variant font-light">
              Traditional stilettos force 85% of body weight onto the metatarsal
              head. The Aurelia recalibrates the center-of-gravity backward by
              12mm, using a hidden carbon-composite shank that redistributes
              load across the natural arch.
            </p>
            <div className="grid grid-cols-2 gap-space-md pt-space-xs">
              <div className="p-space-md bg-surface-container-lowest">
                <span className="font-headline-md text-headline-md text-primary font-normal">
                  95mm
                </span>
                <p className="font-label-uppercase text-label-uppercase text-on-surface-variant uppercase text-[10px] mt-1">
                  Stiletto Height
                </p>
              </div>
              <div className="p-space-md bg-surface-container-lowest">
                <span className="font-headline-md text-headline-md text-primary font-normal">
                  6.2mm
                </span>
                <p className="font-label-uppercase text-label-uppercase text-on-surface-variant uppercase text-[10px] mt-1">
                  Dual Density Latex
                </p>
              </div>
            </div>
          </div>
          <div className="lg:col-span-7">
            <div className="relative aspect-[16/10] overflow-hidden bg-surface-container-highest shadow-sm">
              <Image
                alt="Artisan carving a wooden shoe last in a Florence workshop"
                className="w-full h-full object-cover"
                src={craftImage}
                fill
                sizes="(min-width: 1024px) 55vw, 100vw"
              />
              <div className="absolute inset-0 bg-linear-to-t/srgb from-primary/60 via-transparent to-transparent flex items-end p-space-lg">
                <p className="font-headline-sm text-headline-sm text-on-primary font-normal">
                  Atelier Bottega — Via de&apos; Tornabuoni, Firenze
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
