"use client";

import Price from "@/components/Price";
import type { DeliveryOption } from "@/lib/site";
import { SectionHead, sectionBox } from "./fields";

/**
 * Step 3. One delivery option: a single line (name, timing, fee), nothing to
 * choose. Several: calm square choices. Either way a `delivery` radio is in the
 * form, as placeOrder and the live progress bar expect.
 */
export default function DeliveryOptions({
  options,
  selected,
  onSelect,
}: {
  options: DeliveryOption[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  const single = options.length === 1;
  return (
    <div className={sectionBox} id="step-section-delivery">
      <SectionHead n={3} title="Delivery" />
      <fieldset className={single ? "" : "flex flex-col gap-2"}>
        <legend className="sr-only">Delivery option</legend>
        {options.map((o) => {
          const isActive = o.id === selected;
          return (
            <label
              key={o.id}
              className={`flex items-start justify-between gap-space-md cursor-pointer ${
                single ? "" : `p-space-sm sm:p-space-md transition-shadow ${isActive ? "ring-2 ring-inset ring-primary" : "ring-1 ring-inset ring-outline-variant/70 hover:ring-primary"}`
              }`}
            >
              <span className="flex items-start gap-2.5 min-w-0">
                <input
                  checked={isActive}
                  className={single ? "sr-only" : "mt-1 accent-primary w-4 h-4 cursor-pointer shrink-0"}
                  name="delivery"
                  onChange={() => onSelect(o.id)}
                  type="radio"
                  value={o.id}
                />
                {single && (
                  <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[20px] mt-px shrink-0">
                    local_shipping
                  </span>
                )}
                <span className="flex flex-col min-w-0">
                  <span className="font-body-md text-[15px] text-primary font-medium">{o.name}</span>
                  {o.eta && <span className="font-body-sm text-[13px] text-on-surface-variant">{o.eta}</span>}
                  {o.description && !single && <span className="font-body-sm text-[12px] text-on-surface-variant">{o.description}</span>}
                </span>
              </span>
              <span className="font-body-md text-[15px] text-primary whitespace-nowrap tabular-nums">{o.fee === 0 ? "Free" : <Price amount={o.fee} />}</span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
