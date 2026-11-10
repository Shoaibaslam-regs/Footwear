import Image from "next/image";
import { campaignImage } from "@/lib/data";

export default function Campaign() {
  return (
    <section className="w-full py-space-xl overflow-hidden bg-surface">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-xl items-center">
          {/* Visual Story Column */}
          <div className="lg:col-span-7 relative">
            <div data-reveal="curtain" className="relative w-full aspect-[4/5] rounded-xl overflow-hidden shadow-2xl bg-surface-container">
              <Image
                alt="Elegant woman stepping out of a vintage emerald cab on a wet city street at dusk wearing metallic gold strappy stilettos"
                className="img-fade object-cover"
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                src={campaignImage}
              />
              <div className="absolute inset-0 bg-linear-to-t/srgb from-primary/60 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 p-space-md bg-surface/90 backdrop-blur-md rounded-lg flex items-center justify-between text-on-surface shadow-lg">
                <div>
                  <p className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-widest">
                    Karachi
                  </p>
                  <p className="font-headline-sm text-headline-sm text-primary">
                    Style That Moves With You
                  </p>
                </div>
                <span className="font-label-uppercase text-label-uppercase px-3 py-1 bg-primary text-on-primary rounded-full">
                  Summer Collection
                </span>
              </div>
            </div>
            {/* Decorative offset floating card */}
            <div className="hidden sm:block absolute -top-8 -right-8 w-48 p-space-md bg-secondary-fixed text-on-secondary-fixed rounded-lg shadow-xl">
              <span className="font-label-uppercase text-[10px] tracking-widest uppercase block mb-1">
                Better Balance
              </span>
              <p className="font-body-sm text-body-sm font-medium leading-tight">
                Every stiletto is designed to put 42% less pressure on the
                front of your foot.
              </p>
            </div>
          </div>

          {/* Editorial Narrative Column */}
          <div data-reveal className="lg:col-span-5 flex flex-col gap-space-md lg:pl-space-md">
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.25em]">
              Comfort & Style
            </span>
            <h2 className="font-headline-lg text-headline-lg lg:text-display-hero text-primary font-normal leading-[1.08] tracking-tight">
              Made To Move With You.
            </h2>
            <div className="flex flex-col gap-space-sm font-body-md text-body-md text-on-surface-variant font-light leading-relaxed">
              <p>
                Shoes should look elegant and feel comfortable at the same time.
                Our shoemakers in Karachi build every heel around a strong
                titanium core, covered with soft memory foam that absorbs
                shock.
              </p>
              <p>
                The result feels light and steady. Elegant style you can wear
                comfortably, from late-night parties to long flights.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-space-md pt-space-xs">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  architecture
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-semibold text-primary">
                    Strong Titanium Heel
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    The heel does not bend.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  spa
                </span>
                <div>
                  <h4 className="font-label-md text-label-md font-semibold text-primary">
                    Natural Leather
                  </h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    Treated with plant extracts.
                  </p>
                </div>
              </div>
            </div>
            <div className="pt-space-md">
              <a
                className="inline-flex items-center gap-space-sm px-8 py-4 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-xl group"
                href="#campaign-film"
              >
                <span>Watch the Video</span>
                <span className="material-symbols-outlined text-base transition-transform group-hover:translate-x-1">
                  play_arrow
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
