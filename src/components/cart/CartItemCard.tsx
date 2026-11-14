import Image from "next/image";
import Link from "next/link";
import type { CartItem } from "@/lib/cart-data";
import Price from "@/components/Price";
import { SaleTag } from "@/components/SalePrice";

const chip = "font-label-sm text-label-sm bg-surface-container px-2.5 py-1 rounded";
const stepBtn =
  "w-8 h-8 rounded-full flex items-center justify-center text-on-surface hover:bg-surface transition-colors disabled:opacity-40";

/**
 * One bag line. Phones: a compact row (photo left, details right) so several
 * pairs fit on one screen. From `sm` up: the larger card with all the specs.
 */
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
    <article className="bg-surface-container-lowest p-space-sm sm:p-space-lg rounded-xl shadow-sm transition-all duration-300 hover:shadow-md">
      <div className="flex flex-row gap-space-sm sm:gap-space-md items-stretch">
        {/* Item image (3:4) */}
        <div className="relative w-24 min-w-24 sm:w-40 sm:min-w-[160px] aspect-[3/4] self-start bg-surface-container rounded-lg overflow-hidden flex-shrink-0">
          <Image
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            alt={item.alt}
            src={item.image}
            fill
            sizes="(min-width: 640px) 160px, 96px"
          />
          <span className="hidden sm:inline absolute top-2 left-2 px-2 py-0.5 bg-surface/90 backdrop-blur-md text-on-surface font-label-uppercase text-[10px] uppercase rounded-full">
            {item.badge}
          </span>
        </div>

        {/* Details */}
        <div className="flex flex-col justify-between flex-1 min-w-0">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-0.5 sm:gap-2">
              <div className="min-w-0">
                <span className="font-label-uppercase text-[10px] sm:text-label-uppercase text-secondary uppercase tracking-widest">
                  {item.collection}
                </span>
                {item.sale && <SaleTag className="ml-2 align-middle" tag={item.sale.tag} />}
                <h2 className="font-headline-sm text-[17px] leading-snug sm:text-headline-sm text-primary line-clamp-2">
                  {item.href ? (
                    <Link className="hover:text-secondary transition-colors" href={item.href}>
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                </h2>
              </div>
              <span className="font-body-md text-body-md font-semibold sm:font-headline-sm sm:text-headline-sm sm:font-normal text-primary whitespace-nowrap">
                <Price amount={item.price * item.quantity} />
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 sm:mt-1 line-clamp-1">{item.material}</p>

            {/* Phones: size and stock on one line. */}
            <p className="sm:hidden mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 font-label-sm text-label-sm text-on-surface-variant">
              <span className={chip}>
                Size <strong className="text-primary font-semibold">{item.size}</strong>
              </span>
              <span className={`flex items-center gap-1 ${item.stockNoteClass}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${item.stockDotClass}`} />
                {item.stockNote}
              </span>
            </p>

            {/* Larger screens: all the specs */}
            <div className="hidden sm:flex flex-wrap items-center gap-space-sm mt-3 pt-2 text-on-surface-variant">
              <span className={chip}>
                Size: <strong className="text-primary font-semibold">{item.size}</strong>
              </span>
              <span className={`flex items-center gap-1.5 ${chip}`}>
                <span>Color: {item.color}</span>
                <span className={`w-3 h-3 rounded-full ${item.colorDot} inline-block`} />
              </span>
              <span className={chip}>{item.profile}</span>
            </div>
            <div className={`hidden sm:flex items-center gap-1.5 mt-3 ${item.stockNoteClass} font-label-sm text-label-sm`}>
              <span className={`w-1.5 h-1.5 rounded-full ${item.stockDotClass}`} />
              <span>{item.stockNote}</span>
            </div>
          </div>

          {/* Quantity & actions */}
          <div className="mt-space-sm sm:mt-space-md sm:pt-space-sm flex flex-wrap items-center justify-between gap-x-space-sm gap-y-2">
            <div className="flex items-center bg-surface-container-low rounded-full px-1 sm:px-2 py-0.5 sm:py-1 shadow-inner">
              <button
                aria-label="Decrease quantity"
                className={stepBtn}
                disabled={item.quantity <= 1}
                onClick={() => onQuantity(item.quantity - 1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">remove</span>
              </button>
              <span aria-live="polite" className="font-label-md text-label-md px-2 sm:px-3 font-semibold text-primary">
                {item.quantity}
              </span>
              <button
                aria-label="Increase quantity"
                className={stepBtn}
                disabled={item.quantity >= 10}
                onClick={() => onQuantity(item.quantity + 1)}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
              </button>
            </div>

            <div className="flex items-center gap-space-sm sm:gap-space-md font-label-uppercase text-[11px] sm:text-label-uppercase tracking-wider">
              <button
                aria-label={`Move ${item.name} to wishlist`}
                className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 whitespace-nowrap"
                onClick={onMoveToWishlist}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">favorite</span>
                <span className="sm:hidden">Save</span>
                <span className="hidden sm:inline">Move to Wishlist</span>
              </button>
              <span aria-hidden="true" className="text-outline-variant">
                |
              </span>
              <button
                aria-label={`Remove ${item.name}`}
                className="text-outline hover:text-error transition-colors flex items-center gap-1 whitespace-nowrap"
                onClick={onRemove}
                type="button"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
                Remove
              </button>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}
