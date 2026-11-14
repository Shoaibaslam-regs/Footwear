"use client";

import { useState } from "react";
import { useBottomBar } from "@/lib/use-bottom-bar";
import { checkoutMethods, type PaymentMethod } from "@/lib/orders";
import { formatPrice as formatIn } from "@/lib/currency";
import { FieldError, fieldInput, fieldLabel, type FieldErrors } from "./fields";
import { clock, tryAgainIn } from "@/lib/use-cooldown";

const methodIcon: Record<PaymentMethod, string> = {
  cod: "payments",
  easypaisa: "smartphone",
  jazzcash: "smartphone",
  bank: "account_balance",
  card_link: "credit_card",
};

export default function PaymentSection({
  total,
  pending,
  errors,
  message,
  phone,
  wait = 0,
}: {
  total: number;
  pending: boolean;
  /** Seconds until Place Order works again (rate limit), 0 when free. */
  wait?: number;
  errors?: FieldErrors;
  message?: string;
  /** Prefill for the wallet number. */
  phone?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cod");
  // Orders are charged in PKR, whatever display currency is selected.
  const formatPKR = (n: number) => formatIn(n, "PKR");
  const active = checkoutMethods.find((m) => m.value === method) ?? checkoutMethods[0];
  // With one method there is nothing to choose: it shows as a selected card.
  const single = checkoutMethods.length === 1;

  return (
    <div className="bg-surface-container-lowest p-space-md sm:p-space-lg shadow-sm scroll-mt-28" id="step-section-payment">
      <div className="flex flex-wrap items-baseline justify-between gap-x-space-md gap-y-1 mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 bg-primary text-on-primary font-label-uppercase text-label-uppercase flex items-center justify-center font-semibold">
            4
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Payment</h2>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant font-label-uppercase text-[11px] uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
          <span>Pay when it arrives</span>
        </div>
      </div>

      <fieldset className="space-y-space-sm">
        <legend className="sr-only">Payment method</legend>
        {checkoutMethods.map((m) => {
          const isActive = method === m.value;
          return (
            <div
              key={m.value}
              className={`transition-all ${
                isActive ? "bg-surface-container-low ring-1 ring-secondary" : "bg-surface-container-lowest hover:bg-surface-container-low ring-1 ring-outline-variant/40"
              }`}
            >
              <label className="flex items-center justify-between gap-space-sm sm:gap-space-md p-space-sm sm:p-space-md cursor-pointer select-none">
                <span className="flex items-center gap-space-sm">
                  <input
                    checked={isActive}
                    className={single ? "sr-only" : "accent-primary w-4 h-4 cursor-pointer"}
                    name="paymentMethod"
                    onChange={() => setMethod(m.value)}
                    type="radio"
                    value={m.value}
                  />
                  <span>
                    <span className="block font-body-lg text-body-lg text-primary font-medium">{m.label}</span>
                    <span className={`${isActive ? "block" : "hidden sm:block"} font-body-sm text-body-sm text-on-surface-variant`}>{m.description}</span>
                  </span>
                </span>
                <span className="material-symbols-outlined text-secondary text-[22px]">{methodIcon[m.value]}</span>
              </label>
              {isActive && m.wallet && (
                <div className="px-space-md pb-space-md flex flex-col gap-1">
                  <label className={fieldLabel} htmlFor="co-wallet">
                    {m.label} account number *
                  </label>
                  <input
                    aria-describedby={errors?.walletNumber ? "co-wallet-error" : "co-wallet-hint"}
                    aria-invalid={errors?.walletNumber ? true : undefined}
                    autoComplete="tel"
                    className={fieldInput}
                    defaultValue={phone}
                    id="co-wallet"
                    inputMode="tel"
                    name="walletNumber"
                    placeholder="03XX XXXXXXX"
                    type="tel"
                  />
                  <p className="font-body-sm text-body-sm text-on-surface-variant" id="co-wallet-hint">
                    Approve the request in your {m.label} app. We never ask for your PIN or OTP.
                  </p>
                  <FieldError errors={errors?.walletNumber} id="co-wallet" />
                </div>
              )}
            </div>
          );
        })}
        <FieldError errors={errors?.paymentMethod} id="co-payment" />
      </fieldset>

      <div className="mt-space-lg pt-space-md">
        {message && (
          <p className="mb-space-sm font-body-sm text-body-sm text-on-error-container bg-error-container px-space-md py-space-sm" role="alert">
            {message}
          </p>
        )}
        <button
          className="max-lg:hidden w-full h-14 bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed rounded-none font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-space-sm shadow-md disabled:opacity-75 disabled:cursor-wait"
          disabled={pending || wait > 0}
          type="submit"
        >
          <span className="material-symbols-outlined text-[20px]">{wait > 0 ? "schedule" : "lock"}</span>
          <span aria-live="polite" className="tabular-nums">
            {wait > 0 ? tryAgainIn(wait) : pending ? "Placing order…" : `Place Order (${formatPKR(total)})`}
          </span>
        </button>
        {!single && (
          <p className="mt-space-sm text-center font-body-sm text-body-sm text-on-surface-variant">
            Paying with {active.label}. {active.wallet ? "Keep your phone nearby to approve the payment." : ""}
          </p>
        )}
        <div className="mt-space-sm flex flex-wrap items-center justify-center gap-x-space-md gap-y-1 text-on-surface-variant font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">verified</span> Guaranteed Authenticity
          </span>
          <span className="hidden sm:inline">•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">autorenew</span> 30-Day Returns
          </span>
        </div>
      </div>

      {/* Phones/tablets: Place Order always in reach (inside the form, so it submits it). */}
      <PlaceOrderBar message={message} pending={pending} total={formatPKR(total)} wait={wait} />
    </div>
  );
}

function PlaceOrderBar({ total, pending, message, wait }: { total: string; pending: boolean; message?: string; wait: number }) {
  useBottomBar(message ? 112 : 76);
  return (
    <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-outline-variant/40 shadow-[0_-6px_20px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
      {message && (
        <p className="px-margin-mobile pt-2 font-body-sm text-[12px] leading-snug text-on-error-container line-clamp-2" role="alert">
          {message}
        </p>
      )}
      <div className="h-[76px] px-margin-mobile flex items-center justify-between gap-space-md">
        <div className="min-w-0">
          <span className="block font-label-uppercase text-[10px] uppercase tracking-widest text-on-surface-variant">Total to pay</span>
          <span className="block font-headline-sm text-headline-sm text-primary whitespace-nowrap">{total}</span>
        </div>
        <button
          className="h-12 px-space-lg shrink-0 bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed rounded-full font-label-uppercase text-label-uppercase uppercase tracking-widest font-semibold flex items-center gap-2 transition-colors shadow-md disabled:opacity-75 disabled:cursor-wait"
          disabled={pending || wait > 0}
          type="submit"
        >
          <span aria-hidden="true" className="material-symbols-outlined text-[18px]">{wait > 0 ? "schedule" : "lock"}</span>
          <span aria-live="polite" className="tabular-nums">{wait > 0 ? clock(wait) : pending ? "Placing…" : "Place Order"}</span>
        </button>
      </div>
    </div>
  );
}
