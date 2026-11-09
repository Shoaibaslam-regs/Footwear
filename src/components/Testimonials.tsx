import { testimonials } from "@/lib/data";

export default function Testimonials() {
  return (
    <section className="w-full bg-surface-container-low py-space-xl">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="text-center max-w-xl mx-auto mb-space-xl">
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.25em]">
            Critical Acclaim
          </span>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight mt-1">
            What The Industry Is Saying
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="bg-surface-container-lowest rounded-xl p-space-lg shadow-sm flex flex-col justify-between"
            >
              <div>
                <div
                  className="flex items-center gap-1 text-secondary mb-space-md"
                  aria-label="5 out of 5 stars"
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <span
                      key={i}
                      aria-hidden="true"
                      className="material-symbols-outlined text-base icon-filled"
                    >
                      star
                    </span>
                  ))}
                </div>
                <blockquote className="font-headline-sm text-headline-sm text-primary font-normal italic leading-snug mb-space-md">
                  {t.quote}
                </blockquote>
              </div>
              <div className="flex items-center justify-between pt-space-md border-t border-surface-container">
                <div>
                  <p className="font-label-md text-label-md font-semibold text-primary">
                    {t.author}
                  </p>
                  <p className="font-label-sm text-label-sm text-on-surface-variant">
                    {t.source}
                  </p>
                </div>
                <span className="font-label-uppercase text-[10px] text-secondary font-bold uppercase tracking-widest">
                  {t.tag}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
