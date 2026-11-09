import { craftPillars } from "@/lib/data";

export default function Craft() {
  return (
    <section className="w-full py-space-xl bg-surface scroll-mt-28" id="craft">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="max-w-2xl mx-auto text-center mb-space-xl">
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.25em]">
            Florentine Savoir-Faire
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight mt-1 mb-space-xs">
            The Anatomy of an ÉLORA Shoe
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant font-light">
            Constructed inside our third-generation family workshops on the
            banks of the Arno river, combining ancestral shoemaking methods with
            aerospace balancing science.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-space-xl">
          {craftPillars.map((p) => (
            <div
              key={p.title}
              className="bg-surface-container-low rounded-xl p-space-lg flex flex-col items-center text-center shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="w-16 h-16 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center mb-space-md">
                <span className="material-symbols-outlined text-3xl">
                  {p.icon}
                </span>
              </div>
              <span className="font-label-uppercase text-label-uppercase text-secondary tracking-widest uppercase mb-1">
                {p.eyebrow}
              </span>
              <h3 className="font-headline-md text-headline-md text-primary mb-2">
                {p.title}
              </h3>
              <p className="font-body-sm text-body-sm text-on-surface-variant font-light leading-relaxed">
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
              Behind The Bottega
            </span>
            <h3 className="font-headline-lg text-headline-lg font-normal mb-space-xs text-surface-container-lowest">
              Visit Our Florence Atelier
            </h3>
            <p className="font-body-md text-body-md text-primary-fixed font-light mb-space-md">
              Schedule an intimate private bespoke appointment with Maestro
              Renzo and discover leather grain selections, custom color dyes,
              and made-to-measure last carvings.
            </p>
            <a
              className="inline-flex items-center gap-2 font-label-uppercase text-label-uppercase text-secondary-fixed hover:text-surface-container-lowest uppercase tracking-widest underline underline-offset-8 transition-colors"
              href="#appointment"
            >
              <span>Book Private Appointment</span>
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
                Bottega ÉLORA Firenze
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                Via de&apos; Tornabuoni, 48/R
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
