"use client";

import type { CartItem } from "@/lib/cart-data";
import { removeFromBag, removeFromWishlist, type WishItem } from "@/lib/store";
import { showToast } from "@/lib/toast";
import { confirmDialog } from "@/components/Dialogs";

/** Asks before taking a line out of the bag. Resolves true if removed. */
export async function confirmRemoveFromBag(item: CartItem): Promise<boolean> {
  const ok = await confirmDialog({
    title: "Remove from your bag?",
    message: `${item.name} · ${item.size}${item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}`,
    confirmLabel: "Remove",
    cancelLabel: "Keep in Bag",
    tone: "danger",
    image: { src: item.thumb || item.image, alt: item.thumbAlt || item.alt },
  });
  if (!ok) return false;
  removeFromBag(item.id);
  showToast("Removed from your bag");
  return true;
}

/** Asks before removing a saved piece. Resolves true if removed. */
export async function confirmRemoveFromWishlist(item: WishItem): Promise<boolean> {
  const ok = await confirmDialog({
    title: "Remove from your wishlist?",
    message: item.detail ? `${item.name} · ${item.detail}` : item.name,
    confirmLabel: "Remove",
    cancelLabel: "Keep Saved",
    tone: "danger",
    image: { src: item.image, alt: item.alt },
  });
  if (!ok) return false;
  removeFromWishlist(item.id);
  showToast("Removed from Wishlist");
  return true;
}
