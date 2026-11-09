import type { Metadata } from "next";
import ShoppingBag from "@/components/cart/ShoppingBag";
import { toSearchEntry } from "@/lib/products";
import { getPublishedProducts } from "@/lib/server/products";

export const metadata: Metadata = {
  title: "Your Shopping Bag — ÉLORA Maison",
  description: "See the items in your ÉLORA shopping bag.",
};

export default async function CartPage() {
  // A handful of pieces to suggest; the bag filters out what's already in it.
  const suggestions = (await getPublishedProducts()).slice(0, 8).map((p) => {
    const e = toSearchEntry(p);
    return { slug: p.slug, name: e.name, detail: p.material, price: e.price, compareAt: e.compareAt, discountPercent: e.discountPercent, image: e.image, alt: e.alt, href: e.href };
  });
  return (
    <div className="flex flex-col w-full">
      <ShoppingBag suggestions={suggestions} />
    </div>
  );
}
