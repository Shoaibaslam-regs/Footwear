import Image from "next/image";
import Link from "next/link";
import { LiveCardPriceRow } from "@/components/CardPriceRow";

export type Suggestion = {
  slug: string;
  name: string;
  detail: string;
  price: number;
  compareAt?: number;
  discountPercent?: number;
  category?: string;
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
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-space-lg sm:gap-x-gutter">
        {suggestions.map((c) => (
          // The same card as the shop: photo, detail line, name, price line (sale tag and percent at the right).
          <Link key={c.slug} className="group flex flex-col" href={c.href}>
            <span className="relative block aspect-[3/4] rounded-lg overflow-hidden bg-surface-container">
              <Image
                alt={c.alt}
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                fill
                sizes="(min-width: 640px) 20vw, 50vw"
                src={c.image}
              />
            </span>
            <span className="pt-2.5 sm:pt-space-sm flex flex-col gap-0.5 px-0.5">
              <span className="font-label-uppercase text-[9px] sm:text-[10px] text-outline uppercase tracking-[0.18em] truncate">{c.detail}</span>
              <span className="font-headline-sm text-[15px] sm:text-[18px] leading-snug text-primary tracking-[-0.01em] font-normal line-clamp-2">{c.name}</span>
              <LiveCardPriceRow category={c.category} compareAt={c.compareAt} discountPercent={c.discountPercent} price={c.price} slug={c.slug} />
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
