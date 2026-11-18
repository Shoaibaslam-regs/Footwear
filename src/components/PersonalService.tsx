import SectionEyebrow from "@/components/home/SectionEyebrow";
import SizeGuideLink from "@/components/SizeGuideLink";
import { whatsappUrl } from "@/lib/data";
import { accent, sectionTitle, sectionY, viewAll } from "@/lib/home-type";

/** Ready-made first message, so the customer only taps Send. */
const HELLO = "Hi R'ose Atelier, I'd like help choosing the right size.";

const STEPS = [
  { n: "1", title: "Send your size", text: "Your usual shoe size, or your foot length in cm." },
  { n: "2", title: "Tell us the occasion", text: "Everyday, office, a wedding or a party." },
  { n: "3", title: "We suggest the right pair", text: "A real person replies on WhatsApp with a size and a few shoes to look at." },
];

/**
 * "Personal Service" on the home page (owner, 2026-11-18): one-to-one help on
 * WhatsApp before buying, mostly with sizing. It promises only what the shop
 * already does: a person answers on WhatsApp. No reply time is shown until the
 * owner gives a real one.
 */
export default function PersonalService() {
  return (
    <section className={`w-full ${sectionY}`} id="personal-service">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        <div data-reveal className="lg:col-span-6 flex flex-col gap-5 sm:gap-6">
          <SectionEyebrow n="05">Personal Service</SectionEyebrow>
          <h2 className={sectionTitle}>
            Not Sure About <em className={accent}>Your Size?</em>
          </h2>
          <p className="font-body-md text-[15px] sm:text-body-lg leading-relaxed text-on-surface-variant font-light max-w-lg">
            Message us on WhatsApp and we&apos;ll help you choose the right size, or suggest a pair for your occasion. Just like asking in a shop.
          </p>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-1">
            <a
              className="inline-flex items-center justify-center gap-2.5 h-12 px-7 bg-primary text-on-primary hover:bg-secondary transition-colors font-label-uppercase text-[11px] uppercase tracking-[0.24em]"
              href={`${whatsappUrl}?text=${encodeURIComponent(HELLO)}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                chat
              </span>
              Chat on WhatsApp
            </a>
            <SizeGuideLink className={viewAll}>See the size guide</SizeGuideLink>
          </div>
        </div>

        {/* How it works: three short steps on a quiet card. */}
        <ol data-reveal-stagger className="lg:col-span-6 bg-surface-container-lowest/80 backdrop-blur-sm border border-outline-variant/50 divide-y divide-outline-variant/40">
          {STEPS.map((s) => (
            <li key={s.n} className="flex gap-5 sm:gap-6 px-5 py-5 sm:px-8 sm:py-7">
              <span className="font-headline-lg italic text-[28px] sm:text-[34px] leading-none text-secondary/70 tabular-nums w-6 shrink-0">{s.n}</span>
              <span className="flex flex-col gap-1">
                <span className="font-headline-sm text-[17px] sm:text-[20px] text-primary font-normal">{s.title}</span>
                <span className="font-body-sm text-[13px] sm:text-[14px] text-on-surface-variant font-light leading-relaxed">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
