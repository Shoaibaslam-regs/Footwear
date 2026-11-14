import Image from "next/image";
import { categories } from "@/lib/data";
import { accent, eyebrow, sectionTitle } from "@/lib/home-type";

export default function Categories() {
  return (
    <section
      id="collection"
      className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-lg">
        <div data-reveal>
          <p className={eyebrow}>Shop by Style</p>
          <h2 className={`${sectionTitle} mt-2`}>
            Find the <em className={accent}>Perfect</em> Pair
          </h2>
        </div>
        <p className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant max-w-md">
          Balanced heels, soft memory foam cushioning and hand-shaped
          leather from Italy.
        </p>
      </div>

      <div data-reveal-stagger className="grid grid-cols-2 lg:grid-cols-12 gap-space-sm md:gap-gutter">
        {categories.map((c, i) => (
          <a
            key={c.title}
            className={`group relative ${i === 0 ? "col-span-2 h-64" : "col-span-1 h-52"} md:col-span-1 ${c.span} ${c.height} overflow-hidden rounded-xl bg-surface-container shadow-md flex flex-col justify-end p-space-sm md:p-space-lg`}
            href={c.href}
          >
            <Image
              alt={c.alt}
              className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
              fill
              sizes={i === 0 ? "(min-width: 1024px) 58vw, (min-width: 768px) 50vw, 100vw" : "(min-width: 1024px) 42vw, 50vw"}
              src={c.image}
              style={c.position ? { objectPosition: c.position } : undefined}
            />
            <div className="absolute inset-0 bg-linear-to-t/srgb from-primary/80 via-primary/20 to-transparent" />
            {/* Hover (mouse devices): the photo deepens */}
            <div aria-hidden="true" className="absolute inset-0 bg-primary/25 opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-[var(--ease-lux)]" />
            <div className="relative z-10 flex flex-col text-surface-container-lowest">
              <span className="font-label-uppercase text-[10px] md:text-label-uppercase uppercase tracking-widest text-secondary-fixed mb-1 line-clamp-1">
                {c.eyebrow}
              </span>
              <h3
                className={`${
                  c.large
                    ? "font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
                    : "font-headline-sm text-body-lg md:text-headline-sm"
                } tracking-tight leading-tight group-hover:text-secondary-fixed group-hover:-translate-y-0.5 transition-[color,transform] duration-500 ease-[var(--ease-lux)]`}
              >
                {c.title}
              </h3>
              <p className={`font-body-sm text-xs md:text-body-sm text-primary-fixed mt-1 opacity-90 hidden sm:block`}>
                {c.subtitle}
              </p>
              <span
                aria-hidden="true"
                className="hidden md:flex items-center gap-1 overflow-hidden max-h-0 opacity-0 group-hover:max-h-6 group-hover:opacity-100 group-hover:mt-2 transition-all duration-500 ease-[var(--ease-lux)] font-label-uppercase text-[11px] uppercase tracking-widest text-secondary-fixed"
              >
                Shop
                <span className="material-symbols-outlined text-[16px] transition-transform duration-500 group-hover:translate-x-1">arrow_forward</span>
              </span>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
