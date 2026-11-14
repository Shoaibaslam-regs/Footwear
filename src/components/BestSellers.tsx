import { toBestSellerCard } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import BestSellerCard from "./BestSellerCard";
import { accent, eyebrow, sectionTitle } from "@/lib/home-type";

export default async function BestSellers() {
  const bestSellers = (await getPublishedProducts())
    .filter((p) => p.bestSeller)
    .slice(0, 3)
    .map(toBestSellerCard);
  if (bestSellers.length === 0) return null;
  return (
    <section className="w-full bg-surface-container-low py-space-xl lg:py-28">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-lg lg:mb-space-xl">
          <div data-reveal>
            <span className={eyebrow}>Customer Favourites</span>
            <h2 className={`${sectionTitle} mt-2`}>
              Best <em className={accent}>Sellers</em>
            </h2>
          </div>
          <p className="hidden sm:block font-body-sm text-body-sm text-on-surface-variant font-light max-w-xs">
            Pick your EU size to see what is in stock.
          </p>
        </div>

        {/* Phones: 2 columns; an odd last card spans both so nothing sits alone. */}
        <div data-reveal-stagger className="grid grid-cols-2 md:grid-cols-3 gap-x-space-sm gap-y-space-lg md:gap-x-gutter max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
          {bestSellers.map((item, i) => (
            <BestSellerCard key={item.name} item={item} wide={bestSellers.length % 2 === 1 && i === bestSellers.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
