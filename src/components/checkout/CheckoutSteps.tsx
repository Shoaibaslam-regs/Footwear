"use client";

export type StepTarget = "shipping" | "delivery" | "payment";

const steps: {
  n: number;
  target?: StepTarget;
}[] = [{ n: 1 }, { n: 2, target: "shipping" }, { n: 3, target: "delivery" }, { n: 4, target: "payment" }];

export default function CheckoutSteps({
  current,
  onSelect,
}: {
  current: number;
  onSelect: (step: number, target?: StepTarget) => void;
}) {
  const bar = (n: number) =>
    `h-1 w-full transition-all duration-300 ${
      n === 1 || n <= current ? "bg-primary" : "bg-surface-container-highest"
    }`;
  const target = (n: number) => steps[n - 1].target;

  return (
    <div className="w-full mb-space-xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-space-sm pb-space-md">
        <div>
          <span className="font-label-uppercase text-label-uppercase text-secondary tracking-[0.25em] uppercase">
            Checkout
          </span>
          <h1 className="font-headline-md text-headline-md text-primary font-normal tracking-tight mt-space-xs">
            Complete Your Order
          </h1>
        </div>
        <div className="flex items-center gap-space-xs text-on-surface-variant font-label-uppercase text-label-uppercase">
          <span className="material-symbols-outlined text-[16px] text-secondary">
            verified_user
          </span>
          <span>Secure Checkout (256-bit SSL encryption)</span>
        </div>
      </div>

      <nav
        aria-label="Checkout steps"
        className="grid grid-cols-2 md:grid-cols-4 gap-space-sm pt-space-xs"
      >
        <button
          className="flex flex-col gap-1.5 group text-left"
          onClick={() => onSelect(1)}
          type="button"
        >
          <div className={bar(1)} />
          <div className="flex items-center justify-between text-on-surface w-full">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-secondary">
                check_circle
              </span>{" "}
              01. Contact
            </span>
            <span className="font-body-sm text-body-sm text-secondary">
              Verified
            </span>
          </div>
        </button>
        <button
          aria-current="step"
          className="flex flex-col gap-1.5 group text-left"
          onClick={() => onSelect(2, target(2))}
          type="button"
        >
          <div className={bar(2)} />
          <div className="flex items-center justify-between text-on-surface w-full">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-primary font-semibold">
              02. Address
            </span>
            <span className="font-label-uppercase text-[10px] text-secondary bg-secondary-fixed/50 px-2 py-0.5 rounded-none uppercase">
              Active
            </span>
          </div>
        </button>
        <button
          className="flex flex-col gap-1.5 group text-left"
          onClick={() => onSelect(3, target(3))}
          type="button"
        >
          <div className={bar(3)} />
          <div className="flex items-center justify-between text-on-surface-variant w-full">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
              03. Delivery Method
            </span>
            <span className="font-body-sm text-body-sm text-outline">
              Express
            </span>
          </div>
        </button>
        <button
          className="flex flex-col gap-1.5 group text-left"
          onClick={() => onSelect(4, target(4))}
          type="button"
        >
          <div className={bar(4)} />
          <div className="flex items-center justify-between text-on-surface-variant w-full">
            <span className="font-label-uppercase text-label-uppercase uppercase tracking-wider">
              04. Payment
            </span>
            <span className="font-body-sm text-body-sm text-outline">Final</span>
          </div>
        </button>
      </nav>
    </div>
  );
}
