import Image from "next/image";
import Link from "next/link";
import type { CartItem } from "@/lib/cart-data";
import Price from "@/components/Price";

const chip =
  "font-label-sm text-label-sm bg-surface-container px-2.5 py-1 rounded";
const stepBtn =
  "w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors disabled:opacity-40";

export default function CartItemCard({
  item,
  onQuantity,
  onRemove,
  onMoveToWishlist,
}: {
  item: CartItem;
  onQuantity: (qty: number) => void;
  onRemove: () => void;
  onMoveToWishlist: () => void;
}) {
  return (
    <article className="bg-surface-container-lowest p-space-md sm:p-space-lg rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-col sm:flex-row gap-space-md items-start">
        {/* Item Image (3:4 ratio) */}
        <div className="relative w-full sm:w-40 sm:min-w-[160px] aspect-[3/4] bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
          <Image
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            alt={item.alt}
            src={item.image}
            fill
            sizes="(min-width: 640px) 160px, 100vw"
          />
          <span className="absolute top-2 left-2 px-2 py-0.5 bg-surface/90 backdrop-blur-md text-on-surface font-label-uppercase text-[10px] uppercase rounded-full">
            {item.badge}
          </span>
        </div>

        {/* Product Details */}
        <div className="flex flex-col justify-between flex-1 w-full h-full">
          <div>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-widest">
                  {item.collection}
                </span>
                <h2 className="font-headline-sm text-headline-sm text-primary">
                  {item.href ? (
                    <Link className="hover:text-secondary transition-colors" href={item.href}>
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </h2>
              </div>
              <span className="font-headline-sm text-headline-sm text-primary font-normal whitespace-nowrap">
                <Price amount={item.price * item.quantity} />
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
              {item.material}
            </p>

            {/* Specs Matrix */}
            <div className="flex flex-wrap items-center gap-space-sm mt-3 pt-2 text-on-surface-variant">
              <span className={chip}>
                Size:{" "}
                <strong className="text-primary font-semibold">
                  {item.size}
                </strong>
              </span>
              <span className={`flex items-center gap-1.5 ${chip}`}>
                <span>Color: {item.color}</span>
                <span
                  className={`w-3 h-3 rounded-full ${item.colorDot} inline-block`}
                />
              </span>
              <span className={chip}>{item.profile}</span>
            </div>

            {/* Stock Indicator */}
            <div
              className={`flex items-center gap-1.5 mt-3 ${item.stockNoteClass} font-label-sm text-label-sm`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${item.stockDotClass}`}
              />
              <span>{item.stockNote}</span>
            </div>
          </div>

          {/* Quantity & Actions */}
          <div className="mt-space-md pt-space-sm flex flex-wrap items-center justify-between gap-space-md">
            <div className="flex items-center bg-surface-container-low rounded-full px-2 py-1 shadow-inner">
              <button
                aria-label="Decrease quantity"
                className={stepBtn}
                disabled={item.quantity <= 1}
                onClick={() => onQuantity(item.quantity - 1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  remove
                </span>
              </button>
              <span
                aria-live="polite"
                className="font-label-md text-label-md px-3 font-semibold text-primary"
              >
                {item.quantity}
              </span>
              <button
                aria-label="Increase quantity"
                className={stepBtn}
                disabled={item.quantity >= 10}
                onClick={() => onQuantity(item.quantity + 1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  add
                </span>
              </button>
            </div>

            <div className="flex items-center gap-space-md font-label-uppercase text-label-uppercase tracking-wider">
              <button
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1"
                onClick={onMoveToWishlist}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  favorite
                </span>
                Move to Wishlist
              </button>
              <span className="text-outline-variant">|</span>
              <button
                className="text-outline hover:text-error transition-colors flex items-center gap-1"
                onClick={onRemove}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">
                  close
                </span>
                Remove
              </button>
            </div>
          </div>

        </div>
      </div>
    </article>
  );
}
