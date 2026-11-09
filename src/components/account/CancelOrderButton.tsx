"use client";

import { useActionState } from "react";
import { cancelMyOrder, type CancelState } from "@/app/(shop)/account/actions";
import ConfirmButton from "@/components/ConfirmButton";

export default function CancelOrderButton({ number }: { number: string }) {
  const [state, action, pending] = useActionState<CancelState, FormData>(cancelMyOrder, undefined);
  return (
    <form action={action} className="flex flex-col gap-space-xs">
      <input name="number" type="hidden" value={number} />
      <ConfirmButton
        className="h-11 px-space-lg rounded-full bg-surface-container hover:bg-error hover:text-on-error text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors disabled:opacity-50"
        confirm={{
          title: `Cancel order #${number}?`,
          message: "You can cancel until our team confirms your order.",
          confirmLabel: "Cancel Order",
          cancelLabel: "Keep Order",
          tone: "danger",
        }}
        disabled={pending}
      >
        Cancel Order
      </ConfirmButton>
      {state?.error && <p className="font-body-sm text-body-sm text-error">{state.error}</p>}
      {state?.ok && <p className="font-body-sm text-body-sm text-primary">{state.ok}</p>}
    </form>
  );
}
