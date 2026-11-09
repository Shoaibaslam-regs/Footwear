import { toBestSellerCard } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import BestSellerCard from "./BestSellerCard";

export default async function BestSellers() {
  const bestSellers = (await getPublishedProducts())
    .filter((p) => p.bestSeller)
    .slice(0, 3)
    .map(toBestSellerCard);
  if (bestSellers.length === 0) return null;
  return (
    <section className="w-full bg-surface-container-high py-space-xl">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm mb-space-lg">
          <div data-reveal>
            <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
              Customer Favourites
            </span>
            <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">
              Best Sellers
            </h2>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
            Choose your EU size to check stock straight away. Orders are
            dispatched the same day.
          </p>
        </div>

        {/* Phones: 2 columns; an odd last card spans both so nothing sits alone. */}
        <div data-reveal-stagger className="grid grid-cols-2 md:grid-cols-3 gap-space-sm md:gap-gutter max-md:[&>*:last-child:nth-child(odd)]:col-span-2">
          {bestSellers.map((item, i) => (
            <BestSellerCard key={item.name} item={item} wide={bestSellers.length % 2 === 1 && i === bestSellers.length - 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
