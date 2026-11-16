import Image from "next/image";
import { craftImage } from "@/lib/product-data";

/**
 * "How it's made", for this shoe only: the facts come from its own listing
 * (heel from the spec, material, sizes), never from another product. It used
 * to show one shoe's figures (95mm, carbon support) on every page.
 */
export default function CraftSection({ spec, material, sizes }: { spec: string; material: string; sizes: number[] }) {
  const heel = spec.match(/(\d{1,3})\s*mm/i)?.[1];
  const facts = [
    heel ? { value: `${heel}mm`, label: "Heel height" } : spec ? { value: spec, label: "Style" } : null,
    material ? { value: material, label: "Material" } : null,
    sizes.length ? { value: `EU ${Math.min(...sizes)}–${Math.max(...sizes)}`, label: "Sizes" } : null,
  ].filter((f): f is { value: string; label: string } => !!f);

  return (
    <section className="w-full py-space-xl lg:py-24 border-y border-outline-variant/30">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin grid grid-cols-1 lg:grid-cols-12 gap-space-lg lg:gap-space-xl items-center">
        <div className="lg:col-span-5 order-2 lg:order-1">
          <span className="block font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.32em] text-secondary">How It&apos;s Made</span>
          <h2 className="mt-2 font-headline-lg text-[28px] sm:text-[36px] leading-[1.1] tracking-[-0.02em] text-primary font-normal">
            Made by Hand <em className="italic text-secondary">in Karachi</em>
          </h2>
          <p className="mt-space-sm font-body-md text-[14px] sm:text-[15px] font-light text-on-surface-variant max-w-md">
            Cut, stitched and finished by hand, then checked pair by pair before it is boxed.
          </p>
          <dl className="mt-space-md border-t border-outline-variant/40 divide-y divide-outline-variant/30">
            {facts.map((f) => (
              <div key={f.label} className="py-3 flex items-baseline justify-between gap-space-md">
                <dt className="font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-outline">{f.label}</dt>
                <dd className="font-headline-sm text-[16px] sm:text-[18px] text-primary text-right">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="lg:col-span-7 order-1 lg:order-2">
          <div className="relative aspect-[16/10] overflow-hidden rounded-lg bg-surface-container">
            <Image alt="A shoemaker shaping a shoe by hand" className="object-cover" fill sizes="(min-width: 1024px) 55vw, 92vw" src={craftImage} />
          </div>
        </div>
      </div>
    </section>
  );
}
