import { reassurances } from "@/lib/cart-data";
import Link from "next/link";
import { whatsappUrl } from "@/lib/data";
import Price from "@/components/Price";
import { paymentMethods } from "@/lib/orders";

export default function OrderSummary({
  pieces,
  subtotal,
}: {
  pieces: number;
  subtotal: number;
}) {
  return (
    <aside className="lg:col-span-5 sticky top-28 flex flex-col gap-space-md">
      <div className="bg-surface-container-lowest p-space-lg rounded-2xl shadow-md">
        <div className="flex items-center justify-between pb-space-sm">
          <h2 className="font-headline-sm text-headline-sm text-primary">
            Order Summary
          </h2>
          <span className="font-label-uppercase text-label-uppercase text-secondary font-semibold">
            {pieces} {pieces === 1 ? "PAIR" : "PAIRS"}
          </span>
        </div>

        {/* Cost Breakdown */}
        <div className="flex flex-col gap-space-sm pt-space-md text-body-sm">
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Item Subtotal</span>
            <span className="font-medium text-primary">
              <Price amount={subtotal} />
            </span>
          </div>
          <div className="flex items-center justify-between text-on-surface-variant">
            <span>Delivery</span>
            <span className="font-medium text-on-surface-variant">Calculated at checkout</span>
          </div>

          {/* Total Line */}
          <div className="pt-space-md mt-space-xs">
            <div className="flex items-baseline justify-between gap-space-sm">
              <span className="font-headline-sm text-headline-sm text-primary font-normal">Subtotal</span>
              <span className="font-headline-sm text-headline-sm sm:font-headline-md sm:text-headline-md text-primary font-normal whitespace-nowrap">
                <Price amount={subtotal} />
              </span>
            </div>
            <p className="font-label-sm text-label-sm text-on-surface-variant mt-0.5">Delivery is added at checkout</p>
          </div>

          {/* Accepted payments */}
          <div className="p-space-sm bg-surface-container-low rounded-lg mt-1 flex flex-col gap-2">
            <p className="font-body-sm text-body-sm text-on-surface-variant">Pay your way at checkout:</p>
            <ul className="flex flex-wrap gap-1.5" aria-label="Accepted payment methods">
              {paymentMethods.map((m) => (
                <li
                  key={m.value}
                  className="font-label-uppercase text-[10px] tracking-wider uppercase text-primary font-semibold px-2 py-1 bg-surface-container-highest rounded"
                >
                  {m.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Checkout CTA */}
        <div className="mt-space-lg flex flex-col gap-space-sm">
          <Link
            href="/checkout"
            className="w-full h-[54px] bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed rounded-full font-label-uppercase text-label-uppercase uppercase tracking-[0.18em] font-semibold transition-all duration-300 shadow-md flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">lock</span>
            <span className="sm:hidden">Checkout</span>
            <span className="hidden sm:inline">
              Proceed to Checkout — <Price amount={subtotal} />
            </span>
          </Link>
        </div>

        {/* Reassurance Badges */}
        <div className="mt-space-lg pt-space-md grid grid-cols-1 gap-space-sm">
          {reassurances.map((r) => (
            <div key={r.text} className="flex items-center gap-space-sm">
              <span className="material-symbols-outlined text-secondary text-[20px]">
                {r.icon}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {r.text}
              </span>
            </div>
          ))}
        </div>

        {/* Concierge Support */}
        <div className="mt-space-lg p-space-md bg-surface-container rounded-xl flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              support_agent
            </span>
            <span className="font-label-uppercase text-label-uppercase text-primary font-semibold tracking-wider">
              Need Help?
            </span>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Not sure about your size, or what to wear for an event? Our
            stylists in Karachi are here to help.
          </p>
          <div className="flex items-center gap-space-md pt-1">
            <a
              className="font-label-uppercase text-label-uppercase text-primary underline underline-offset-4 decoration-secondary hover:text-secondary transition-colors"
              href={`${whatsappUrl}?text=${encodeURIComponent("Hello Ŕose Atelier, I'd like help with sizing.")}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              Chat on WhatsApp
            </a>
            <span className="text-outline-variant">•</span>
            <Link
              className="font-label-uppercase text-label-uppercase text-primary underline underline-offset-4 decoration-secondary hover:text-secondary transition-colors"
              href="/#appointment"
            >
              Book a Video Fitting
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
