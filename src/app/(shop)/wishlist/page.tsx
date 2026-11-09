import type { Metadata } from "next";
import Wishlist from "@/components/Wishlist";

export const metadata: Metadata = {
  title: "Your Wishlist — ÉLORA Maison",
  description: "The items you have saved at ÉLORA.",
};

export default function WishlistPage() {
  return (
    <div className="flex flex-col w-full">
      <Wishlist />
    </div>
  );
}
