import { categories } from "@/lib/data";

export default function Categories() {
  return (
    <section
      id="collection"
      className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin py-space-xl"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-md mb-space-lg">
        <div>
          <p className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em] mb-1">
            Curation By Form
          </p>
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
            The Architectural Disciplines
          </h2>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
          Engineered with balancing counterweights, proprietary memory
          cushioning, and hand-lasted calfskins from Santa Croce sull&apos;Arno.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-12 gap-space-sm md:gap-gutter">
        {categories.map((c, i) => (
          <a
            key={c.title}
            className={`group relative ${i === 0 ? "col-span-2 h-64" : "col-span-1 h-52"} md:col-span-1 ${c.span} ${c.height} overflow-hidden rounded-xl bg-surface-container shadow-md flex flex-col justify-end p-space-sm md:p-space-lg`}
            href={c.href}
          >
            <div
              role="img"
              aria-label={c.alt}
              className="absolute inset-0 bg-cover bg-center transition-transform duration-700 ease-out group-hover:scale-105"
              style={{ backgroundImage: `url('${c.image}')` }}
            />
            <div className="absolute inset-0 bg-linear-to-t/srgb from-primary/80 via-primary/20 to-transparent" />
            <div className="relative z-10 flex flex-col text-surface-container-lowest">
              <span className="font-label-uppercase text-[10px] md:text-label-uppercase uppercase tracking-widest text-secondary-fixed mb-1 line-clamp-1">
                {c.eyebrow}
              </span>
              <h3
                className={`${
                  c.large
                    ? "font-headline-sm text-headline-sm md:font-headline-md md:text-headline-md"
                    : "font-headline-sm text-body-lg md:text-headline-sm"
                } tracking-tight leading-tight group-hover:text-secondary-fixed transition-colors`}
              >
                {c.title}
              </h3>
              <p className={`font-body-sm text-xs md:text-body-sm text-primary-fixed mt-1 opacity-90 ${i === 0 ? "" : "hidden sm:block"}`}>
                {c.subtitle}
              </p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
