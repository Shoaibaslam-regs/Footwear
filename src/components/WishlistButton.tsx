"use client";

import { requireLogin } from "@/lib/require-login";
import { useEffect, useState } from "react";
import { toggleWishlist, useIsWishlisted, type WishItem } from "@/lib/store";
import { showToast } from "@/lib/toast";

const variants = {
  /** Home page "New Arrivals" cards */
  default: {
    button:
      "absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-surface/90 hover:bg-surface flex items-center justify-center transition-colors shadow-sm",
    icon: "text-[19px]",
  },
  /** Collection catalog cards */
  catalog: {
    button:
      "absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur-md flex items-center justify-center hover:text-error transition-all shadow-sm active:scale-90 hover:scale-110 cursor-pointer z-10",
    icon: "text-[18px]",
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
