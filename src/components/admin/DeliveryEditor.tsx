"use client";

import { useState } from "react";
import type { DeliveryOption } from "@/lib/site";

let seq = 0;
const newId = () => `option-${Date.now().toString(36)}${(seq++).toString(36)}`;

/** Edits the checkout delivery options; serialised into a hidden input. */
export default function DeliveryEditor({ initial, max }: { initial: DeliveryOption[]; max: number }) {
  const [options, setOptions] = useState(initial);
  const update = (i: number, change: Partial<DeliveryOption>) =>
    setOptions((list) => list.map((o, j) => (j === i ? { ...o, ...change } : o)));

  return (
    <div className="flex flex-col gap-3">
      <input name="deliveryOptions" type="hidden" value={JSON.stringify(options)} />
      {options.map((o, i) => (
        <fieldset key={o.id} className="rounded-md border border-[var(--a-line)] p-3 grid grid-cols-1 sm:grid-cols-[1fr_1fr_140px] gap-2">
          <legend className="px-1 text-xs muted">Option {i + 1}{i === 0 ? " (selected by default)" : ""}</legend>
          <label className="field">
            Name
            <input className="input" onChange={(e) => update(i, { name: e.target.value })} placeholder="e.g. TCS Standard" value={o.name} />
          </label>
          <label className="field">
            Delivery time
            <input className="input" onChange={(e) => update(i, { eta: e.target.value })} placeholder="e.g. 2–4 working days" value={o.eta} />
          </label>
          <label className="field">
            Fee (PKR)
            <input
              className="input"
              inputMode="numeric"
              min={0}
              onChange={(e) => update(i, { fee: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
              type="number"
              value={o.fee}
            />
          </label>
          <label className="field sm:col-span-2">
            Note shown to customers <span className="muted font-normal">(optional)</span>
            <input className="input" onChange={(e) => update(i, { description: e.target.value })} placeholder="e.g. Lahore, Karachi & Islamabad" value={o.description} />
          </label>
          <div className="flex items-end">
            <button className="btn btn-danger w-full" disabled={options.length === 1} onClick={() => setOptions((l) => l.filter((_, j) => j !== i))} type="button">
              Remove
            </button>
          </div>
        </fieldset>
      ))}
      {options.length < max && (
        <button
          className="btn self-start"
          onClick={() => setOptions((l) => [...l, { id: newId(), name: "", eta: "", description: "", fee: 0 }])}
          type="button"
        >
          Add delivery option
        </button>
      )}
    </div>
  );
}
