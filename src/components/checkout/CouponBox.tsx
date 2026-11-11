"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { applyCouponCode, removeCouponCode } from "@/lib/coupon-actions";
import { clock, useCooldown } from "@/lib/use-cooldown";
import type { CouponResult, CouponTerms } from "@/lib/coupons";
import { couponHeadline } from "@/lib/coupons";
import Price from "@/components/Price";
import { showToast } from "@/lib/toast";

/** "Have a coupon code?" box in the checkout summary. One coupon per order. */
export default function CouponBox({
  terms,
  result,
  onChange,
}: {
  terms: CouponTerms | null;
  /** Live result for the current bag and delivery fee. */
  result: CouponResult | null;
  onChange: (terms: CouponTerms | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [pending, start] = useTransition();
  // Too many wrong codes: Apply locks and counts down.
  const [limited, setLimited] = useState<{ s: number } | null>(null);
  const wait = useCooldown(limited?.s, limited);

  const apply = () =>
    start(async () => {
      setError(null);
      setCardUrl(null);
      const r = await applyCouponCode(code);
      if (!r.ok) {
        if (r.retryAfter) return setLimited({ s: r.retryAfter });
        setCardUrl(r.cardUrl ?? null);
        return setError(r.error);
      }
      onChange(r.terms);
      setCode("");
      setOpen(false);
      showToast(`Coupon ${r.terms.code} applied`);
    });

  const remove = () =>
    start(async () => {
      await removeCouponCode();
      onChange(null);
      showToast("Coupon removed");
    });

  if (terms) {
    const saved = result?.ok ? result.itemDiscount + result.deliveryDiscount : 0;
    return (
      <div className="border border-dashed border-secondary/60 bg-secondary-container/25 p-space-sm flex flex-col gap-1">
        <div className="flex items-center justify-between gap-space-sm">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="material-symbols-outlined text-secondary text-[18px]">sell</span>
            <span className="font-label-uppercase text-label-uppercase tracking-[0.14em] text-primary font-bold truncate">{terms.code}</span>
            <span className="font-body-sm text-body-sm text-on-surface-variant whitespace-nowrap">· {couponHeadline(terms).toLowerCase()}</span>
          </span>
          <button
            className="font-label-uppercase text-label-uppercase text-on-surface-variant hover:text-error underline underline-offset-4 disabled:opacity-50"
            disabled={pending}
            onClick={remove}
            type="button"
          >
            Remove
          </button>
        </div>
        {result?.ok ? (
          <p className="font-body-sm text-body-sm text-secondary">
            You save <strong><Price amount={saved} /></strong> on this order.
          </p>
        ) : (
          result && (
            <p className="font-body-sm text-body-sm text-error" role="status">
              {result.reason}
            </p>
          )
        )}
      </div>
    );
  }

  if (!open) {
    return (
      <button
        className="flex items-center gap-1.5 font-label-uppercase text-label-uppercase text-primary hover:text-secondary"
        onClick={() => setOpen(true)}
        type="button"
      >
        <span className="material-symbols-outlined text-[18px]">sell</span>
        <span className="underline underline-offset-4 decoration-secondary">Have a coupon code?</span>
      </button>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <label className="font-label-uppercase text-label-uppercase text-on-surface-variant" htmlFor="coupon-code">
        Coupon code
      </label>
      <div className="flex gap-space-xs">
        <input
          aria-describedby={error ? "coupon-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoCapitalize="characters"
          autoComplete="off"
          autoFocus
          className="flex-1 min-w-0 h-11 px-space-sm bg-surface-container-low border border-outline-variant/60 focus:border-primary focus:outline-none font-body-md text-body-md uppercase tracking-wider"
          id="coupon-code"
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (code.trim() && wait === 0) apply();
            }
          }}
          placeholder="e.g. EID20"
          value={code}
        />
        <button
          className="h-11 px-space-md bg-primary text-on-primary hover:bg-secondary font-label-uppercase text-label-uppercase uppercase tracking-widest disabled:opacity-50 transition-colors"
          disabled={pending || !code.trim() || wait > 0}
          onClick={apply}
          type="button"
        >
          {wait > 0 ? <span className="tabular-nums">Wait {clock(wait)}</span> : pending ? "…" : "Apply"}
        </button>
      </div>
      {error && (
        <p className={`font-body-sm text-body-sm ${cardUrl ? "text-on-surface-variant" : "text-error"}`} id="coupon-error" role="alert">
          {error}
        </p>
      )}
      {cardUrl && (
        <Link
          className="mt-1 self-start inline-flex items-center gap-1.5 h-10 px-space-md bg-primary text-on-primary hover:bg-secondary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors"
          href={cardUrl}
        >
          <span className="material-symbols-outlined icon-filled text-[18px]">redeem</span>
          Open my surprise card
        </Link>
      )}
    </div>
  );
}
