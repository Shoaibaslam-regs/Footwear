"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { confirmCodOrder, resendCodOrderCode, type PlaceOrderState } from "@/app/(shop)/checkout/actions";
import { CodeBoxes, maskEmail } from "@/components/auth/VerifyCode";
import { useDialog } from "@/components/header/useDialog";
import Price from "@/components/Price";
import { clock, useCooldown } from "@/lib/use-cooldown";
import { showToast } from "@/lib/toast";

type Placed = Extract<NonNullable<PlaceOrderState>, { ok: true }>["order"];

const RESEND_SECONDS = 60;
/** Matches ORDER_CODE.codeMinutes on the server (lib/server/order-codes.ts). */
const VALID_SECONDS = 10 * 60;

/**
 * Cash on Delivery from a new customer: the code card over the checkout.
 * The last digit sends the code; a right code places the order (`onPlaced`).
 * Closing it, or a code that expired, sends the customer back to the form.
 */
export default function OrderCodeDialog({
  email,
  total,
  onPlaced,
  onClose,
}: {
  email: string;
  total: number;
  onPlaced: (order: Placed) => void;
  onClose: (message?: string) => void;
}) {
  const [state, action, pending] = useActionState<PlaceOrderState, FormData>(confirmCodOrder, undefined);
  const close = () => onClose();
  const panel = useDialog<HTMLDivElement>(true, close);
  const form = useRef<HTMLFormElement>(null);
  const lastSent = useRef("");
  const [resend, setResend] = useState<{ s: number }>({ s: RESEND_SECONDS });
  const resendWait = useCooldown(resend.s, resend);
  const [valid, setValid] = useState<{ s: number }>({ s: VALID_SECONDS });
  const validLeft = useCooldown(valid.s, valid);
  const [sending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) onPlaced(state.order);
    else if (state.restart) onClose(state.message);
  }, [state, onPlaced, onClose]);

  const failed = state && !state.ok && !state.restart ? state : null;
  const error = failed?.errors?.code?.join(" ") ?? failed?.message;

  const submitCode = (code: string) => {
    if (pending || code === lastSent.current) return;
    lastSent.current = code;
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  const resendNow = () =>
    start(async () => {
      setNote(null);
      const r = await resendCodOrderCode();
      if (r.ok) {
        setResend({ s: RESEND_SECONDS });
        setValid({ s: VALID_SECONDS });
        lastSent.current = "";
        showToast("New code sent. Check your inbox.");
      } else if (r.retryAfter) {
        setResend({ s: r.retryAfter });
      } else if (r.error) {
        setNote(r.error);
      }
    });

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-space-md">
      <div aria-hidden="true" className="absolute inset-0 bg-primary/40 backdrop-blur-sm" onClick={close} />
      <div
        aria-labelledby="order-code-title"
        aria-modal="true"
        className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto bg-surface-container-lowest rounded-t-2xl sm:rounded-xl shadow-2xl p-space-lg sm:p-space-xl pb-[calc(env(safe-area-inset-bottom)+1.5rem)]"
        ref={panel}
        role="dialog"
      >
        <form action={action} className="flex flex-col gap-space-md text-center" noValidate ref={form}>
          <div className="flex flex-col items-center gap-space-xs">
            <span className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center shadow-inner">
              <span aria-hidden="true" className="material-symbols-outlined icon-filled text-secondary text-[26px]">lock</span>
            </span>
            <span className="mt-space-xs font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-[0.24em] text-secondary">
              Cash on Delivery · Order check
            </span>
            <h2 className="font-headline-md text-headline-md text-primary tracking-tight" id="order-code-title">
              Confirm your order
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
              We sent a 6-digit code to <strong className="text-primary font-semibold break-all">{maskEmail(email)}</strong>. Enter it to place
              your order of{" "}
              <strong className="text-primary font-semibold whitespace-nowrap">
                <Price amount={total} />
              </strong>
              .
            </p>
          </div>

          <div className="flex flex-col gap-space-xs text-left">
            <div className="flex items-center justify-between gap-space-sm">
              <span className="font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-wider text-on-surface-variant">
                Enter 6-digit code
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-label-uppercase text-[10px] tracking-wider tabular-nums ${
                  validLeft > 0 ? "bg-surface-container text-on-surface-variant" : "bg-error-container text-on-error-container"
                }`}
              >
                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${validLeft > 0 ? "bg-secondary" : "bg-error"}`} />
                {validLeft > 0 ? `Valid ${clock(validLeft)}` : "Code expired"}
              </span>
            </div>
            {/* A new answer (e.g. a wrong code) clears the boxes, so retyping starts fresh. */}
            <CodeBoxes key={error ?? ""} invalid={!!error} onComplete={submitCode} />
            <div className="flex items-center justify-between gap-space-sm font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span aria-hidden="true" className="material-symbols-outlined text-[15px]">content_paste</span>
                You can paste the code
              </span>
              <button className="underline underline-offset-4 decoration-secondary hover:text-primary" onClick={close} type="button">
                Change order
              </button>
            </div>
            {error && (
              <p className="font-body-sm text-body-sm text-error" role="alert">
                {error}
              </p>
            )}
          </div>

          <button
            className="h-[52px] rounded-lg bg-primary text-on-primary enabled:hover:bg-secondary enabled:hover:text-on-secondary disabled:opacity-60 transition-colors font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            disabled={pending}
            type="submit"
          >
            {pending ? "Placing order…" : "Confirm & Place Order"}
            {!pending && <span aria-hidden="true" className="material-symbols-outlined text-[18px]">arrow_forward</span>}
          </button>
          <button
            className="h-11 rounded-lg bg-surface-container text-primary enabled:hover:bg-surface-container-high font-label-uppercase text-[11px] sm:text-label-uppercase uppercase tracking-widest flex items-center justify-center gap-2 transition-colors disabled:text-on-surface-variant disabled:cursor-not-allowed tabular-nums"
            disabled={resendWait > 0 || sending}
            onClick={resendNow}
            type="button"
          >
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">autorenew</span>
            {sending ? "Sending…" : resendWait > 0 ? `Resend code in ${clock(resendWait)}` : "Resend code"}
          </button>
          {note && (
            <p className="font-body-sm text-body-sm text-on-error-container bg-error-container rounded-lg px-space-md py-space-sm" role="alert">
              {note}
            </p>
          )}
          <p className="font-body-sm text-[12px] text-on-surface-variant">
            We ask new customers to confirm Cash on Delivery orders once. Can&apos;t find the email? Check your spam folder.
          </p>
        </form>
      </div>
    </div>,
    document.body,
  );
}
