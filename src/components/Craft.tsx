import { craftPillars } from "@/lib/data";
import { accent, eyebrow, sectionTitle } from "@/lib/home-type";

export default function Craft() {
  return (
    <section className="w-full py-space-xl bg-surface scroll-mt-28" id="craft">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div data-reveal className="max-w-2xl mx-auto text-center mb-space-lg sm:mb-space-xl">
          <span className={eyebrow}>Made in Karachi</span>
          <h2 className={`${sectionTitle} mt-2 mb-space-xs`}>
            What Goes Into an <em className={accent}>Ŕose Atelier</em> Shoe
          </h2>
          <p className="hidden sm:block font-body-md text-body-md text-on-surface-variant font-light">
            Made in our family workshops in Karachi, run by the third
            generation. We mix traditional shoemaking with modern technology
            for better balance.
          </p>
        </div>

        <div data-reveal-stagger className="grid grid-cols-2 md:grid-cols-3 gap-space-sm sm:gap-gutter mb-space-xl">
          {craftPillars.map((p) => (
            <div
              key={p.title}
              className="bg-surface-container-low rounded-xl p-space-md sm:p-space-lg flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow last:odd:col-span-2 md:last:odd:col-span-1"
            >
              <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-space-sm sm:mb-space-md">
                <span className="material-symbols-outlined text-xl sm:text-3xl">
                  {p.icon}
                </span>
              </div>
              <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest uppercase mb-1">
                {p.eyebrow}
              </span>
              <h3 className="font-headline-sm text-headline-sm sm:font-headline-md sm:text-headline-md text-primary sm:mb-2">
                {p.title}
              </h3>
              <p className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant font-light leading-relaxed">
                {p.text}
              </p>
            </div>
          ))}
        </div>

        {/* Workshop Banner */}
        <div
          id="appointment"
          className="relative rounded-2xl overflow-hidden bg-primary-container p-space-lg lg:p-space-xl shadow-xl flex flex-col lg:flex-row items-center justify-between gap-space-lg"
        >
          <div className="max-w-xl text-surface">
            <span className="font-label-uppercase text-label-uppercase text-secondary-fixed uppercase tracking-widest block mb-2">
              Our Workshop
            </span>
            <h3 className="font-headline-lg text-headline-lg font-normal mb-space-xs text-surface-container-lowest">
              Visit Our Karachi Workshop
            </h3>
            <p className="font-body-md text-body-md text-primary-fixed font-light mb-space-md">
              Book a private appointment with our master shoemaker, Renzo.
              Choose your leather and colour, and get a pair made to your exact
              foot size.
            </p>
            <a
              className="inline-flex items-center gap-2 font-label-uppercase text-label-uppercase text-secondary-fixed hover:text-surface-container-lowest uppercase tracking-widest transition-colors"
              href="#appointment"
            >
              <span className="link-draw [--draw-color:var(--color-secondary-fixed)] [background-size:100%_1px] hover:[background-size:0%_1px]">
                Book an Appointment
              </span>
              <span className="material-symbols-outlined text-sm">
                arrow_outward
              </span>
            </a>
          </div>
          <div className="w-full lg:w-96 rounded-xl bg-surface p-space-md text-on-surface shadow-2xl flex items-center gap-space-md">
            <div className="w-16 h-16 rounded-lg bg-surface-container flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-secondary text-2xl">
                location_on
              </span>
            </div>
            <div>
              <h4 className="font-label-md text-label-md font-semibold text-primary">
                Ŕose Atelier Workshop
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Karachi, Pakistan
              </p>
              <p className="font-label-sm text-label-sm text-secondary font-medium mt-1">
                Open Mon–Sat • By Appointment
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
