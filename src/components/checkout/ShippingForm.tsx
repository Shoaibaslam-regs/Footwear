"use client";

import { useState } from "react";
import { countries } from "@/lib/checkout-data";
import { FieldError, TextField, fieldInput, fieldLabel, quietLink, SectionHead, sectionBox, type FieldErrors } from "./fields";

const ADDRESS_FIELDS = ["phone", "line1", "line2", "city", "postalCode", "country"];

/**
 * Step 2. A returning customer's saved address shows as a short summary with
 * "Change"; the fields stay in the form (hidden) and open on "Change" or when
 * one has an error. Phones get number keypads for the phone and postal code.
 * While delivery is Pakistan only, the country is a hidden field, not a box.
 */
export default function ShippingForm({
  errors,
  defaults,
}: {
  errors?: FieldErrors;
  /** Last address used by this client. */
  defaults?: { phone: string; line1: string; line2: string; city: string; postalCode: string } | null;
}) {
  const [changing, setChanging] = useState(false);
  const [flat, setFlat] = useState(!!defaults?.line2);
  const [country, setCountry] = useState(countries[0].code);
  const hasError = ADDRESS_FIELDS.some((f) => errors?.[f]);
  const saved = !!defaults?.line1 && !!defaults.city && !!defaults.phone;
  const open = !saved || changing || hasError;
  const dial = countries.find((c) => c.code === country)?.dial ?? "";

  return (
    <div className={sectionBox} id="step-section-shipping">
      <SectionHead
        aside={
          saved &&
          !open && (
            <button className={quietLink} onClick={() => setChanging(true)} type="button">
              Change
            </button>
          )
        }
        n={2}
        title="Delivery Address"
      />

      {saved && !open && (
        <address className="not-italic font-body-md text-[15px] text-primary leading-relaxed">
          {defaults!.line1}
          {defaults!.line2 && <span className="block">{defaults!.line2}</span>}
          <span className="block">
            {defaults!.city} {defaults!.postalCode}
          </span>
          <span className="block text-[13px] text-on-surface-variant">
            {dial} {defaults!.phone}
          </span>
        </address>
      )}

      <div className="flex flex-col gap-space-md" hidden={!open}>
        <TextField
          autoComplete="address-line1"
          defaultValue={defaults?.line1}
          errors={errors}
          label="Address *"
          name="line1"
          placeholder="House number, street and area"
          required
        />
        {flat ? (
          <TextField autoComplete="address-line2" defaultValue={defaults?.line2} errors={errors} label="Flat / Floor (optional)" name="line2" placeholder="Flat number, floor, building" />
        ) : (
          <>
            <input name="line2" type="hidden" value="" />
            <button className={`${quietLink} self-start -mt-2`} onClick={() => setFlat(true)} type="button">
              + Add flat or floor
            </button>
          </>
        )}
        <div className="grid grid-cols-2 gap-space-sm sm:gap-space-md">
          <TextField autoComplete="address-level2" defaultValue={defaults?.city} errors={errors} label="City *" name="city" required />
          <TextField autoComplete="postal-code" defaultValue={defaults?.postalCode} errors={errors} inputMode="numeric" label="Postal Code *" name="postalCode" required />
        </div>

        {countries.length === 1 ? (
          <input name="country" type="hidden" value={countries[0].code} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <label className={fieldLabel} htmlFor="co-country">
              Country *
            </label>
            <select autoComplete="country" className={`${fieldInput} cursor-pointer`} id="co-country" name="country" onChange={(e) => setCountry(e.target.value)} value={country}>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <FieldError errors={errors?.country} id="co-country" />
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className={fieldLabel} htmlFor="co-phone">
            Phone for the courier *
          </label>
          <div className="flex">
            <span className="h-12 px-3 ring-1 ring-inset ring-outline-variant/80 bg-surface-container-low text-on-surface-variant flex items-center font-body-md text-[15px] select-none">{dial}</span>
            <input
              aria-describedby={errors?.phone ? "co-phone-error" : undefined}
              aria-invalid={errors?.phone ? true : undefined}
              autoComplete="tel"
              className={`flex-1 min-w-0 -ml-px ${fieldInput}`}
              defaultValue={defaults?.phone}
              id="co-phone"
              inputMode="tel"
              name="phone"
              placeholder="0300 1234567"
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
