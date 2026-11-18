import Link from "next/link";
import { toBestSellerCard } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";
import BestSellerCard from "./BestSellerCard";
import { accent, sectionHead, sectionTitle, sectionY, viewAll } from "@/lib/home-type";
import SectionEyebrow from "@/components/home/SectionEyebrow";

export default async function NewArrivals() {
  const all = await getPublishedProducts();
  const flagged = all.filter((p) => p.newArrival);
  const newArrivals = (flagged.length ? flagged : all).slice(0, 4).map(toBestSellerCard);
  return (
    <section className={`w-full ${sectionY}`} id="new-arrivals">
      <div className="max-w-[1536px] mx-auto px-margin-mobile lg:px-margin">
        <div className={`flex items-end justify-between gap-space-md ${sectionHead}`}>
          <div data-reveal>
            <SectionEyebrow n="02">Just In</SectionEyebrow>
            <h2 className={`${sectionTitle} mt-2`}>
              New <em className={accent}>Arrivals</em>
            </h2>
          </div>
          <Link
            className={viewAll}
            href="/collections?sort=newest"
          >
            View all
          </Link>
        </div>

        {/* The same card as Best Sellers: photo, name, details, price, size and Add to Bag. */}
        <div data-reveal-stagger className="grid grid-cols-2 lg:grid-cols-4 gap-x-space-sm gap-y-space-lg sm:gap-x-gutter">
          {newArrivals.map((item) => (
            <BestSellerCard key={item.name} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}
