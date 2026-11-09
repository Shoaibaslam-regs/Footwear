"use client";

import { useState } from "react";
import { countries } from "@/lib/checkout-data";
import { FieldError, TextField, fieldInput, fieldLabel, type FieldErrors } from "./fields";

export default function ShippingForm({
  errors,
  defaults,
}: {
  errors?: FieldErrors;
  /** Last address used by this client. */
  defaults?: { phone: string; line1: string; line2: string; city: string; postalCode: string } | null;
}) {
  const [country, setCountry] = useState("PK");
  const dial = countries.find((c) => c.code === country)?.dial ?? "";

  return (
    <div className="bg-surface-container-lowest p-space-lg shadow-sm scroll-mt-28" id="step-section-shipping">
      <div className="flex items-baseline justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 bg-primary text-on-primary font-label-uppercase text-label-uppercase flex items-center justify-center font-semibold">
            2
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Shipping Address</h2>
        </div>
        <span className="font-label-uppercase text-label-uppercase text-on-surface-variant tracking-wider uppercase">
          Destination
        </span>
      </div>
      {defaults && (
        <p className="mb-space-sm font-body-sm text-body-sm text-on-surface-variant flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px] text-secondary">bookmark</span>
          Filled in from your last order. Change anything you need.
        </p>
      )}
      <div className="space-y-space-md">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <TextField autoComplete="address-line1" className="md:col-span-2" errors={errors} label="Street Address *" defaultValue={defaults?.line1} name="line1" placeholder="House number and street name" required />
          <TextField autoComplete="address-line2" errors={errors} label="Apartment / Suite" defaultValue={defaults?.line2} name="line2" placeholder="Apt, Suite, Floor" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          <TextField autoComplete="address-level2" errors={errors} label="City *" defaultValue={defaults?.city} name="city" required />
          <TextField autoComplete="postal-code" errors={errors} label="Postal Code *" defaultValue={defaults?.postalCode} name="postalCode" required />
          <div className="flex flex-col gap-1">
            <label className={fieldLabel} htmlFor="co-country">
              Country / Territory *
            </label>
            <div className="relative">
              <select
                autoComplete="country"
                className={`${fieldInput} appearance-none cursor-pointer`}
                id="co-country"
                name="country"
                onChange={(e) => setCountry(e.target.value)}
                value={country}
              >
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-3.5 text-on-surface-variant pointer-events-none text-[20px]">
                expand_more
              </span>
            </div>
            <FieldError errors={errors?.country} id="co-country" />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel} htmlFor="co-phone">
            Phone for courier updates *
          </label>
          <div className="flex gap-2">
            <span className="h-12 px-space-md bg-surface-container-high text-on-surface flex items-center font-body-sm text-body-sm select-none">
              {dial}
            </span>
            <input
              aria-describedby={errors?.phone ? "co-phone-error" : undefined}
              aria-invalid={errors?.phone ? true : undefined}
              autoComplete="tel"
              className={`flex-1 ${fieldInput}`}
              id="co-phone"
              defaultValue={defaults?.phone}
              name="phone"
              placeholder="0314 8428115"
              required
              type="tel"
            />
          </div>
          <FieldError errors={errors?.phone} id="co-phone" />
        </div>
      </div>
    </div>
  );
}
