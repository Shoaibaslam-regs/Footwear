"use client";

import Link from "next/link";
import Price from "@/components/Price";
import type { DeliveryOption } from "@/lib/site";

export default function DeliveryOptions({
  options,
  selected,
  onSelect,
}: {
  options: DeliveryOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="bg-surface-container-lowest p-space-lg shadow-sm scroll-mt-28" id="step-section-delivery">
      <div className="flex items-baseline justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 bg-primary text-on-primary font-label-uppercase text-label-uppercase flex items-center justify-center font-semibold">
            3
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Delivery</h2>
        </div>
        <Link
          className="font-label-uppercase text-label-uppercase text-secondary hover:text-primary tracking-widest uppercase underline underline-offset-4"
          href="/policies/shipping-returns"
          target="_blank"
        >
          Shipping &amp; Returns
        </Link>
      </div>
      <fieldset className="space-y-space-sm">
        <legend className="sr-only">Delivery option</legend>
        {options.map((o) => {
          const isActive = o.id === selected;
          return (
            <label
              key={o.id}
              className={`flex items-start justify-between gap-space-md p-space-md cursor-pointer transition-all ${
                isActive ? "bg-surface-container-low ring-1 ring-secondary" : "bg-surface-container-lowest hover:bg-surface-container-low ring-1 ring-outline-variant/40"
              }`}
            >
              <span className="flex items-start gap-space-md">
                <input
                  checked={isActive}
                  className="mt-1 accent-primary w-4 h-4 cursor-pointer"
                  name="delivery"
                  onChange={() => onSelect(o.id)}
                  type="radio"
                  value={o.id}
                />
                <span className="flex flex-col">
                  <span className="font-body-lg text-body-lg text-primary font-medium">{o.name}</span>
                  {o.eta && (
                    <span className="font-body-sm text-body-sm text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                      {o.eta}
                    </span>
                  )}
                  {o.description && <span className="font-body-sm text-body-sm text-on-surface-variant">{o.description}</span>}
                </span>
              </span>
              <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                {o.fee === 0 ? "Free" : <Price amount={o.fee} />}
              </span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
