"use client";

import { requireLogin } from "@/lib/require-login";
import { useEffect, useState } from "react";
import { toggleWishlist, useIsWishlisted, type WishItem } from "@/lib/store";
import { showToast } from "@/lib/toast";

const variants = {
  /** Home page "New Arrivals" cards */
  default: {
    button:
      "skin-bead absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-surface/90 hover:bg-surface flex items-center justify-center transition-colors shadow-sm",
    icon: "text-[19px]",
  },
  /** Collection catalog cards */
  catalog: {
    button:
      // Calm: a small round button that doesn't compete with the photo.
      "skin-bead absolute top-1.5 right-1.5 sm:top-2 sm:right-2 w-8 h-8 rounded-[999px] bg-surface/80 backdrop-blur-sm flex items-center justify-center text-primary transition-colors active:scale-95 cursor-pointer z-10",
    icon: "text-[17px]",
  },
};

export default function WishlistButton({
  item,
  variant = "default",
}: {
  item: WishItem;
  variant?: keyof typeof variants;
}) {
  const saved = useIsWishlisted(item.id);
  const [popping, setPopping] = useState(false);
  const v = variants[variant];

  useEffect(() => {
    if (!popping) return;
    const id = setTimeout(() => setPopping(false), 450);
    return () => clearTimeout(id);
  }, [popping]);

  const toggle = async () => {
    if (!(await requireLogin("save items to your wishlist"))) return;
    const added = toggleWishlist(item);
    setPopping(true);
    showToast(added ? "Added to Wishlist" : "Removed from Wishlist");
  };

  return (
    <button
      aria-label={saved ? `Remove ${item.name} from Wishlist` : `Save ${item.name} to Wishlist`}
      aria-pressed={saved}
      className={`${v.button} ${saved ? "text-error" : "text-on-surface"}${
        popping ? " animate-heart-pop" : ""
      }`}
      onClick={toggle}
      type="button"
    >
      <span
        className={`material-symbols-outlined ${v.icon}${saved ? " icon-filled" : ""}`}
      >
        favorite
      </span>
    </button>
  );
}
