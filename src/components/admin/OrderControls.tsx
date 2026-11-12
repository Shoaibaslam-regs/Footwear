"use client";

import { useActionState } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import {
  addOrderNote,
  setOrderEta,
  setOrderStatus,
  setPaymentStatus,
  type OrderActionState,
} from "@/app/admin/actions";
import {
  etaLabel,
  etaPresets,
  etaReasons,
  nextStatuses,
  orderStatusLabel,
  paymentStatusLabel,
  paymentStatuses,
  type Order,
} from "@/lib/orders";

function Notice({ state }: { state: OrderActionState }) {
  if (!state) return null;
  return (
    <p aria-live="polite" className={`notice ${state.error ? "notice-bad" : "notice-ok"}`} role="status">
      {state.error ?? state.ok}
    </p>
  );
}

export function StatusControl({ order }: { order: Order }) {
  const [state, action, pending] = useActionState(setOrderStatus, undefined);
  const options = nextStatuses[order.status];
  if (options.length === 0) {
    return <p className="muted">This order is {orderStatusLabel[order.status].toLowerCase()}. No further steps.</p>;
  }
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={order.id} />
      <label className="field">
        Tracking number {order.trackingNumber ? <span className="muted font-normal">(current: {order.trackingNumber})</span> : <span className="muted font-normal">(required to ship)</span>}
        <input className="input" defaultValue="" name="trackingNumber" placeholder="e.g. TCS 1234567890" />
      </label>
      <label className="field">
        Note for the history <span className="muted font-normal">(optional)</span>
        <input className="input" name="note" placeholder="e.g. Confirmed by phone" />
      </label>
      <div className="flex flex-wrap gap-2">
        {options.map((s) =>
          s === "cancelled" ? (
            <ConfirmButton
              key={s}
              className="btn btn-danger"
              confirm={{
                title: `Cancel order ${order.number}?`,
                message: "The customer's order will be marked cancelled. This step cannot be reversed.",
                confirmLabel: "Cancel order",
                cancelLabel: "Keep order",
                tone: "danger",
                variant: "admin",
              }}
              disabled={pending}
              name="status"
              value={s}
            >
              Cancel order
            </ConfirmButton>
          ) : (
            <button key={s} className="btn btn-primary" disabled={pending} name="status" type="submit" value={s}>
              Mark {orderStatusLabel[s]}
            </button>
          ),
        )}
      </div>
      <Notice state={state} />
    </form>
  );
}

export function PaymentControl({ order }: { order: Order }) {
  const [state, action, pending] = useActionState(setPaymentStatus, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input name="id" type="hidden" value={order.id} />
      <label className="field">
        Payment status
        <select defaultValue={order.payment.status} name="paymentStatus">
          {paymentStatuses.map((s) => (
            <option key={s} value={s}>
              {paymentStatusLabel[s]}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Reference <span className="muted font-normal">(bank slip, transaction or refund ID)</span>
        <input className="input" defaultValue={order.payment.reference} name="reference" />
      </label>
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Update payment"}
      </button>
      <Notice state={state} />
    </form>
  );
}

export function NoteControl({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState(addOrderNote, undefined);
  return (
    <form action={action} className="flex flex-col gap-2">
      <input name="id" type="hidden" value={orderId} />
      <textarea name="note" placeholder="Internal note (not shown to the customer)" rows={2} />
      <button className="btn self-start" disabled={pending} type="submit">
        Add note
      </button>
      <Notice state={state} />
    </form>
  );
}

/**
 * Expected delivery: one tap for "arrives in 4–5 days" (counted from today,
 * Pakistan time), or exact dates. An optional reason is shown to the customer
 * too. Saving emails the customer.
 */
export function EtaControl({ order }: { order: Order }) {
  const [state, action, pending] = useActionState(setOrderEta.bind(null, "save"), undefined);
  const [cleared, clearAction, clearing] = useActionState(setOrderEta.bind(null, "clear"), undefined);
  const busy = pending || clearing;
  return (
    <div className="flex flex-col gap-3">
      {order.eta ? (
        <div className="notice flex items-start justify-between gap-3">
          <span>
            <span className="block font-semibold">Arriving {etaLabel(order.eta)}</span>
            {order.eta.note && <span className="muted text-[13px] block">{order.eta.note}</span>}
          </span>
          <form action={clearAction}>
            <input name="id" type="hidden" value={order.id} />
            <button className="btn btn-sm" disabled={busy} type="submit">
              Clear
            </button>
          </form>
        </div>
      ) : (
        <p className="muted text-[13px]">Not set yet. Tell the customer when to expect their parcel, especially when many orders are waiting.</p>
      )}
      <form action={action} className="flex flex-col gap-3">
        <input name="id" type="hidden" value={order.id} />
        <label className="field">
          Reason <span className="muted font-normal">(optional, the customer sees it)</span>
          <input className="input" defaultValue={order.eta?.note ?? ""} list="eta-reasons" maxLength={160} name="reason" placeholder="e.g. Many orders right now" />
          <datalist id="eta-reasons">
            {etaReasons.map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </label>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Arrives in</span>
          <div className="flex flex-wrap gap-1.5">
            {etaPresets.map((p) => (
              <button key={p.id} className="btn btn-sm" disabled={busy} name="preset" type="submit" value={p.id}>
                {p.from}–{p.to} days
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="font-semibold">Or pick dates</span>
          <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
            <input aria-label="Earliest day" className="input min-w-0 px-2" name="from" type="date" />
            <span className="muted">to</span>
            <input aria-label="Latest day (optional)" className="input min-w-0 px-2" name="to" type="date" />
          </div>
          <button className="btn btn-primary self-start mt-1" disabled={busy} type="submit">
            {pending ? "Saving…" : "Save dates"}
          </button>
        </div>
      </form>
      <Notice state={state ?? cleared} />
    </div>
  );
}
