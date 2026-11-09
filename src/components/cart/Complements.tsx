import Image from "next/image";
import Link from "next/link";
import SalePrice from "@/components/SalePrice";

export type Suggestion = {
  slug: string;
  name: string;
  detail: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  image: string;
  alt: string;
  href: string;
};

/** "You may also like": real listings not already in the bag. */
export default function Complements({ suggestions }: { suggestions: Suggestion[] }) {
  if (suggestions.length === 0) return null;
  return (
    <div className="mt-space-sm pt-space-md">
      <div className="flex items-center justify-between mb-space-md">
        <div>
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
            Complete the Look
          </span>
          <h3 className="font-headline-sm text-headline-sm text-primary">You May Also Like</h3>
        </div>
        <Link
          className="font-label-uppercase text-label-uppercase text-primary hover:text-secondary tracking-widest transition-colors flex items-center gap-1"
          href="/collections"
        >
          View All
          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
        </Link>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-space-sm sm:gap-gutter">
        {suggestions.map((c) => (
          <Link
            key={c.slug}
            className="bg-surface-container-lowest p-space-sm rounded-xl shadow-sm hover:shadow-xl transition-shadow flex flex-col group"
            href={c.href}
          >
            <div className="aspect-square bg-surface-container rounded-lg overflow-hidden relative">
              <Image
                alt={c.alt}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                fill
                sizes="(min-width: 640px) 20vw, 50vw"
                src={c.image}
              />
            </div>
            <div className="mt-space-sm flex-1 flex flex-col">
              <h4 className="font-body-md text-body-md font-medium text-primary truncate group-hover:text-secondary transition-colors">
                {c.name}
              </h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{c.detail}</p>
              <span className="mt-auto pt-2 font-body-md text-body-md text-primary font-semibold">
                <SalePrice compareAt={c.compareAt} discountPercent={c.discountPercent} price={c.price} />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
