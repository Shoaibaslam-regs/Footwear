"use client";

import { useState } from "react";
import { paymentMethods, type PaymentMethod } from "@/lib/orders";
import { formatPrice as formatIn } from "@/lib/currency";
import { FieldError, fieldInput, fieldLabel, type FieldErrors } from "./fields";

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
}: {
  total: number;
  pending: boolean;
  errors?: FieldErrors;
  message?: string;
  /** Prefill for the wallet number. */
  phone?: string;
}) {
  const [method, setMethod] = useState<PaymentMethod>("cod");
  // Orders are charged in PKR, whatever display currency is selected.
  const formatPKR = (n: number) => formatIn(n, "PKR");
  const active = paymentMethods.find((m) => m.value === method)!;

  return (
    <div className="bg-surface-container-lowest p-space-lg shadow-sm scroll-mt-28" id="step-section-payment">
      <div className="flex items-baseline justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 bg-primary text-on-primary font-label-uppercase text-label-uppercase flex items-center justify-center font-semibold">
            4
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Payment Method</h2>
        </div>
        <div className="flex items-center gap-1 text-on-surface-variant font-label-uppercase text-[11px] uppercase tracking-widest">
          <span className="material-symbols-outlined text-[16px] text-secondary">lock</span>
          <span>No card or PIN details stored</span>
        </div>
      </div>

      <fieldset className="space-y-space-sm">
        <legend className="sr-only">Payment method</legend>
        {paymentMethods.map((m) => {
          const isActive = method === m.value;
          return (
            <div
              key={m.value}
              className={`transition-all ${
                isActive ? "bg-surface-container-low ring-1 ring-secondary" : "bg-surface-container-lowest hover:bg-surface-container-low ring-1 ring-outline-variant/40"
              }`}
            >
              <label className="flex items-center justify-between gap-space-md p-space-md cursor-pointer select-none">
                <span className="flex items-center gap-space-sm">
                  <input
                    checked={isActive}
                    className="accent-primary w-4 h-4 cursor-pointer"
                    name="paymentMethod"
                    onChange={() => setMethod(m.value)}
                    type="radio"
                    value={m.value}
                  />
                  <span>
                    <span className="block font-body-lg text-body-lg text-primary font-medium">{m.label}</span>
                    <span className="block font-body-sm text-body-sm text-on-surface-variant">{m.description}</span>
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
          className="w-full h-14 bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed rounded-none font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] transition-all duration-300 flex items-center justify-center gap-space-sm shadow-md disabled:opacity-75 disabled:cursor-wait"
          disabled={pending}
          type="submit"
        >
          <span className="material-symbols-outlined text-[20px]">lock</span>
          <span aria-live="polite">
            {pending ? "Placing your order…" : `Place Order (${formatPKR(total)})`}
          </span>
        </button>
        <p className="mt-space-sm text-center font-body-sm text-body-sm text-on-surface-variant">
          Paying with {active.label}. {active.wallet ? "Keep your phone nearby to approve the payment." : ""}
        </p>
        <div className="mt-space-sm flex flex-wrap items-center justify-center gap-space-md text-on-surface-variant font-label-uppercase text-[11px] uppercase tracking-wider">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">verified</span> Guaranteed Authenticity
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-secondary">autorenew</span> 30-Day Atelier Returns
          </span>
        </div>
      </div>
    </div>
  );
}
