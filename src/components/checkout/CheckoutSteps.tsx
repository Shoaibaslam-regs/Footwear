"use client";

import { useEffect, useState } from "react";
import { checkoutProgress, stepsCompleted } from "@/lib/checkout-progress";

export type StepTarget = "shipping" | "delivery" | "payment";
/** The checkout <form> (components/checkout/Checkout.tsx). */
export const FORM_ID = "checkout-form";

const steps: { n: number; label: string; target?: StepTarget }[] = [
  { n: 1, label: "Contact" },
  { n: 2, label: "Address", target: "shipping" },
  { n: 3, label: "Delivery", target: "delivery" },
  { n: 4, label: "Payment", target: "payment" },
];

/**
 * The checkout progress bar, live: a step gets its tick once every required
 * box in it is filled in (the server's own rules, lib/checkout-progress.ts),
 * and the line fills up to the last finished step. Leave a box empty and the
 * bar stops there. It re-checks on every keystroke and choice in the form.
 */
export default function CheckoutSteps({ onSelect }: { onSelect: (step: number, target?: StepTarget) => void }) {
  const [completed, setCompleted] = useState(0);

  useEffect(() => {
    const form = document.getElementById(FORM_ID) as HTMLFormElement | null;
    if (!form) return;
    const check = () => setCompleted(stepsCompleted(checkoutProgress(new FormData(form))));
    check();
    // Browser autofill can land a moment after the page shows.
    const late = setTimeout(check, 600);
    form.addEventListener("input", check);
    form.addEventListener("change", check);
    return () => {
      clearTimeout(late);
      form.removeEventListener("input", check);
      form.removeEventListener("change", check);
    };
  }, []);

  // The step to do next (none once all four are done).
  const active = completed + 1;
  // Filled part of the line: from the first dot to the last finished one.
  const fill = (Math.max(0, completed - 1) / (steps.length - 1)) * 100;

  return (
    <div className="w-full mb-space-lg sm:mb-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-md">
        <div>
          <span className="font-label-uppercase text-label-uppercase text-secondary tracking-[0.25em] uppercase">Checkout</span>
          <h1 className="font-headline-sm text-[26px] leading-tight sm:font-headline-md sm:text-headline-md text-primary font-normal tracking-tight mt-space-xs">
            Complete Order
          </h1>
        </div>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-uppercase text-label-uppercase">
          <span className="material-symbols-outlined text-[16px] text-secondary">verified_user</span>
          <span>
            Secure Checkout<span className="hidden sm:inline"> (256-bit SSL encryption)</span>
          </span>
        </div>
      </div>

      <nav aria-label="Checkout steps" className="pt-space-sm">
        <ol className="relative grid grid-cols-4">
          {/* The line runs between the first and last dot (each dot sits in the middle of its column). */}
          <span aria-hidden="true" className="absolute top-[13px] sm:top-[15px] left-[12.5%] right-[12.5%] h-0.5 bg-surface-container-highest" />
          <span
            aria-hidden="true"
            className="absolute top-[13px] sm:top-[15px] left-[12.5%] h-0.5 bg-primary transition-[width] duration-500 ease-out motion-reduce:transition-none"
            style={{ width: `${fill * 0.75}%` }}
          />
          {steps.map((s) => {
            const done = s.n <= completed;
            const isActive = s.n === active;
            return (
              <li className="relative flex justify-center" key={s.n}>
                <button
                  aria-current={isActive ? "step" : undefined}
                  aria-label={`Step ${s.n}: ${s.label}${done ? ", done" : isActive ? ", to do" : ""}`}
                  className="group flex flex-col items-center gap-1.5 sm:gap-2 min-w-0"
                  onClick={() => onSelect(s.n, s.target)}
                  type="button"
                >
                  <span
                    className={`relative z-[1] w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-label-uppercase text-[11px] font-semibold transition-all duration-300 ${
                      done
                        ? "bg-primary text-on-primary"
                        : isActive
                          ? "bg-surface-container-lowest text-primary ring-2 ring-primary shadow-[0_0_0_4px_var(--color-surface-container-high)]"
                          : "bg-surface-container-lowest text-outline ring-1 ring-outline-variant group-hover:ring-primary group-hover:text-primary"
                    }`}
                  >
                    {done ? (
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] sm:text-[18px]">
                        check
                      </span>
                    ) : (
                      s.n
                    )}
                  </span>
                  <span
                    className={`font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-wider whitespace-nowrap transition-colors ${
                      isActive ? "text-primary font-semibold" : done ? "text-on-surface" : "text-outline"
                    }`}
                  >
                    {s.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </div>
  );
}
