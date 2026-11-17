import type { Metadata } from "next";
import Wishlist from "@/components/Wishlist";

export const metadata: Metadata = {
  title: "Wishlist — R'ose Atelier",
  description: "The items you have saved at R'ose Atelier.",
};

export default function WishlistPage() {
  return (
    <div className="flex flex-col w-full">
      <Wishlist />
    </div>
  );
}
