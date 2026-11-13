"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCoupon, type CouponFormState } from "@/app/admin/coupons/actions";
import { couponConditions, couponHeadline, couponTypeLabel, couponTypes, RANDOM_DEFAULT, type CouponType } from "@/lib/coupons";
import type { CouponRow } from "@/lib/server/coupons";

function Err({ list }: { list?: string[] }) {
  return list?.length ? <span className="error">{list.join(" ")}</span> : null;
}

/** ISO → "YYYY-MM-DD" in Pakistan time, for date inputs. */
const toDay = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: "Asia/Karachi" }) : "");

export default function CouponForm({ coupon }: { coupon?: CouponRow }) {
  const [state, action, pending] = useActionState<CouponFormState, FormData>(saveCoupon, undefined);
  const [type, setType] = useState<CouponType>(coupon?.type ?? "percent");
  const [value, setValue] = useState(String(coupon?.value ?? (type === "percent" ? 10 : "")));
  const [maxDiscount, setMaxDiscount] = useState(coupon?.maxDiscount != null ? String(coupon.maxDiscount) : "");
  const [minOrder, setMinOrder] = useState(coupon?.minOrder != null ? String(coupon.minOrder) : "");
  const [appliesTo, setAppliesTo] = useState<"bag" | "pairs">(coupon?.maxPairs ? "pairs" : "bag");
  const [maxPairs, setMaxPairs] = useState(String(coupon?.maxPairs ?? 1));
  const [perCustomer, setPerCustomer] = useState(String(coupon?.perCustomer ?? 1));
  const [fullPriceOnly, setFullPriceOnly] = useState(coupon?.fullPriceOnly ?? true);
  const [minPercent, setMinPercent] = useState(String(coupon?.minPercent ?? RANDOM_DEFAULT[0]));
  const [maxPercent, setMaxPercent] = useState(String(coupon?.maxPercent ?? RANDOM_DEFAULT[1]));
  const surprise = type === "random";
  const e = state?.errors ?? {};
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const preview = {
    code: "",
    type,
    value: Number(value) || 0,
    maxDiscount: type === "percent" || surprise ? num(maxDiscount) : null,
    maxPairs: (type === "percent" || surprise) && appliesTo === "pairs" ? Number(maxPairs) || 1 : null,
    minOrder: num(minOrder),
    fullPriceOnly: type !== "free_delivery" && fullPriceOnly,
    startsAt: null,
    endsAt: null,
    perCustomer: surprise ? 1 : Number(perCustomer) || 1,
    range: surprise ? ([Number(minPercent) || 0, Number(maxPercent) || 0] as [number, number]) : null,
  };

  return (
    <form action={action} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_300px] gap-4" noValidate>
      {coupon && <input name="id" type="hidden" value={coupon.id} />}

      <div className="panel p-4 flex flex-col gap-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="field">
            Code
            <input
              autoCapitalize="characters"
              className="input uppercase tracking-wider"
              defaultValue={coupon?.code}
              disabled={!!coupon}
              name="code"
              placeholder="EID20"
              required
            />
            {coupon ? (
              <span className="muted font-normal text-xs">The code can&apos;t change after it is created.</span>
            ) : (
              <span className="muted font-normal text-xs">3–24 letters, numbers or hyphens. Customers can type it in any case.</span>
            )}
            {coupon && <input name="code" type="hidden" value={coupon.code} />}
            <Err list={e.code} />
          </label>
          <label className="field">
            Type
            <select name="type" onChange={(ev) => setType(ev.target.value as CouponType)} value={type}>
              {couponTypes.map((t) => (
                <option key={t} value={t}>
                  {couponTypeLabel[t]}
                </option>
              ))}
            </select>
            <Err list={e.type} />
          </label>
          {surprise && (
            <div className="sm:col-span-2 grid grid-cols-2 gap-4 rounded-lg border border-dashed border-[var(--color-outline)] p-3">
              <p className="col-span-2 muted text-xs">
                Every customer who opens this offer gets their own code and a random percent between these two numbers. It is saved for them and never
                changes. They see it only after scratching the card.
              </p>
              <label className="field">
                Lowest percent
                <input className="input" inputMode="numeric" max={90} min={1} name="minPercent" onChange={(ev) => setMinPercent(ev.target.value)} step={1} type="number" value={minPercent} />
                <Err list={e.minPercent} />
              </label>
              <label className="field">
                Highest percent
                <input className="input" inputMode="numeric" max={90} min={1} name="maxPercent" onChange={(ev) => setMaxPercent(ev.target.value)} step={1} type="number" value={maxPercent} />
                <Err list={e.maxPercent} />
              </label>
            </div>
          )}
          {type !== "free_delivery" && !surprise && (
            <label className="field">
              {type === "percent" ? "Percent off" : "Amount off (PKR)"}
              <input className="input" inputMode="numeric" min={1} name="value" onChange={(ev) => setValue(ev.target.value)} step={1} type="number" value={value} />
              <Err list={e.value} />
            </label>
          )}
          {(type === "percent" || surprise) && (
            <fieldset className="sm:col-span-2 flex flex-col gap-2">
              <legend className="font-semibold mb-1">Applies to</legend>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <label className="flex items-center gap-2 font-normal">
                  <input checked={appliesTo === "bag"} name="appliesTo" onChange={() => setAppliesTo("bag")} type="radio" value="bag" />
                  Every eligible pair in the bag
                </label>
                <label className="flex items-center gap-2 font-normal">
                  <input checked={appliesTo === "pairs"} name="appliesTo" onChange={() => setAppliesTo("pairs")} type="radio" value="pairs" />
                  Only up to
                  <input
                    aria-label="Number of pairs"
                    className="input w-20"
                    disabled={appliesTo !== "pairs"}
                    inputMode="numeric"
                    max={20}
                    min={1}
                    name="maxPairs"
                    onChange={(ev) => setMaxPairs(ev.target.value)}
                    step={1}
                    type="number"
                    value={maxPairs}
                  />
                  {Number(maxPairs) === 1 ? "pair" : "pairs"}
                </label>
              </div>
              <span className="muted text-xs">
                With a pair limit, the percent comes off the most expensive pairs; the rest of the bag is full price. E.g. 30% on up to 2 pairs, with 6 pairs in the bag: 30% off the 2 dearest.
              </span>
              <Err list={e.maxPairs} />
            </fieldset>
          )}
          {(type === "percent" || surprise) && (
            <label className="field">
              Maximum discount (PKR) <span className="muted font-normal">{surprise ? "(recommended: caps a big percent)" : "(optional)"}</span>
              <input className="input" inputMode="numeric" min={0} name="maxDiscount" onChange={(ev) => setMaxDiscount(ev.target.value)} placeholder="No limit" step={1} type="number" value={maxDiscount} />
              <Err list={e.maxDiscount} />
            </label>
          )}
          <label className="field">
            Minimum order (PKR) <span className="muted font-normal">(optional)</span>
            <input className="input" inputMode="numeric" min={0} name="minOrder" onChange={(ev) => setMinOrder(ev.target.value)} placeholder="None" step={1} type="number" value={minOrder} />
            <span className="muted font-normal text-xs">Items total, before delivery.</span>
            <Err list={e.minOrder} />
          </label>
        </div>

        <fieldset className="grid grid-cols-1 sm:grid-cols-2 gap-4 min-w-0">
          <legend className="font-semibold mb-2">Limits</legend>
          <label className="field">
            {surprise ? "Cards to give" : "Total uses"} <span className="muted font-normal">(optional)</span>
            <input className="input" defaultValue={coupon?.maxUses ?? ""} inputMode="numeric" min={1} name="maxUses" placeholder="Unlimited" step={1} type="number" />
            <span className="muted font-normal text-xs">{surprise ? "e.g. 200 for the first 200 customers who open it." : "e.g. 100 for the first 100 orders."}</span>
            <Err list={e.maxUses} />
          </label>
          {surprise ? (
            <div className="field">
              Uses per customer
              <span className="muted font-normal">One card per customer, used once.</span>
            </div>
          ) : (
            <label className="field">
              Uses per customer
              <input className="input" inputMode="numeric" min={1} name="perCustomer" onChange={(ev) => setPerCustomer(ev.target.value)} step={1} type="number" value={perCustomer} />
              <Err list={e.perCustomer} />
            </label>
          )}
          <label className="field">
            Starts <span className="muted font-normal">(optional)</span>
            <input className="input" defaultValue={toDay(coupon?.startsAt ?? null)} name="startsAt" type="date" />
            <Err list={e.startsAt} />
          </label>
          <label className="field">
            Ends <span className="muted font-normal">(optional, last day it works)</span>
            <input className="input" defaultValue={toDay(coupon?.endsAt ?? null)} name="endsAt" type="date" />
            <Err list={e.endsAt} />
          </label>
        </fieldset>

        {type !== "free_delivery" && (
          <label className="flex items-start gap-2">
            <input checked={fullPriceOnly} className="mt-1" name="fullPriceOnly" onChange={(ev) => setFullPriceOnly(ev.target.checked)} type="checkbox" />
            <span>
              Full-price items only
              <span className="block muted text-xs">Items that already have a sale discount don&apos;t get the coupon too. Recommended.</span>
            </span>
          </label>
        )}
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel p-4 flex flex-col gap-3">
          <label className="flex items-start gap-2">
            <input className="mt-1" defaultChecked={coupon?.active ?? true} name="active" type="checkbox" />
            <span>
              Active
              <span className="block muted text-xs">Untick to pause it. Customers then see &ldquo;This code is not valid.&rdquo;</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input className="mt-1" defaultChecked={coupon?.public ?? false} name="public" type="checkbox" />
            <span>
              Show on website
              <span className="block muted text-xs">
                Customers see it under &ldquo;Coupons&rdquo; on their account page, and on the bag and checkout pages. Leave it off for codes you only share by link or WhatsApp.
              </span>
            </span>
          </label>
          <div className="rounded-lg border border-dashed border-[var(--color-outline)] p-3">
            <span className="block muted text-xs">Customers see</span>
            <span className="block text-lg font-semibold">{couponHeadline(preview)}</span>
            <span className="block muted text-xs">{couponConditions(preview).join(" · ")}</span>
          </div>
          {state?.message && (
            <p className="error" role="alert">
              {state.message}
            </p>
          )}
          <div className="flex gap-2">
            <button className="btn btn-primary" disabled={pending} type="submit">
              {pending ? "Saving…" : coupon ? "Save changes" : "Create coupon"}
            </button>
            <Link className="btn" href="/admin/coupons">
              Cancel
            </Link>
          </div>
        </div>
      </div>
    </form>
  );
}
