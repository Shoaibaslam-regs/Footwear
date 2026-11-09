"use client";

import { useActionState } from "react";
import ConfirmButton from "@/components/ConfirmButton";
import {
  addOrderNote,
  setOrderStatus,
  setPaymentStatus,
  type OrderActionState,
} from "@/app/admin/actions";
import {
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
