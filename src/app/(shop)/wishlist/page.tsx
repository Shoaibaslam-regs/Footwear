import type { Metadata } from "next";
import Wishlist from "@/components/Wishlist";

export const metadata: Metadata = {
  title: "Your Wishlist — ÉLORA Maison",
  description: "The pieces you have saved from the ÉLORA Maison atelier.",
};

export default function WishlistPage() {
  return (
    <div className="flex flex-col w-full">
      <Wishlist />
    </div>
  );
}
