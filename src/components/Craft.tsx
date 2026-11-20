import { craftPillars } from "@/lib/data";
import { accent, sectionHead, sectionTitle, sectionY } from "@/lib/home-type";
import SectionEyebrow from "@/components/home/SectionEyebrow";

export default function Craft() {
  return (
    <section className={`w-full ${sectionY} scroll-mt-28`} id="craft">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div data-reveal className={`max-w-2xl mx-auto text-center ${sectionHead}`}>
          <SectionEyebrow center n="06">Made in Karachi</SectionEyebrow>
          <h2 className={`${sectionTitle} mt-2 mb-space-xs`}>
            What Goes Into an <em className={accent}>R&apos;ose Atelier</em> Shoe
          </h2>
          <p className="hidden sm:block font-body-md text-body-md text-on-surface-variant font-light">
            Designed and made in Karachi. We mix traditional shoemaking with
            modern technology for better balance.
          </p>
        </div>

        <div data-reveal-stagger className="grid grid-cols-2 md:grid-cols-3 gap-space-sm sm:gap-gutter">
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
      </div>
    </section>
  );
}
