"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { resendRegistrationCode, verifyRegistration, type AuthState } from "@/lib/auth/actions";
import { clock, useCooldown } from "@/lib/use-cooldown";
import { showToast } from "@/lib/toast";

const RESEND_SECONDS = 60;

/**
 * Sign-up, step 2: the 6-digit code from the email. Pasting or typing the 6th
 * digit submits by itself. "Resend code" is locked for a minute after each send.
 */
export default function VerifyCode({
  email,
  next,
  onBack,
}: {
  email: string;
  next?: string;
  /** Back to the sign-up form (to change the email, or when the sign-up expired). */
  onBack: (message?: string) => void;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(verifyRegistration, undefined);
  const form = useRef<HTMLFormElement>(null);
  const [resend, setResend] = useState<{ s: number }>({ s: RESEND_SECONDS });
  const wait = useCooldown(resend.s, resend);
  const [sending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // The sign-up expired: back to the form with the reason.
  useEffect(() => {
    if (state?.restart) onBack(state.message);
  }, [state, onBack]);

  const error = state?.errors?.code?.join(" ") ?? (state?.restart ? undefined : state?.message);

  const resendNow = () =>
    start(async () => {
      setNote(null);
      const r = await resendRegistrationCode(email);
      if (r.ok) {
        setResend({ s: RESEND_SECONDS });
        showToast("New code sent. Check your inbox.");
      } else if (r.retryAfter) {
        setResend({ s: r.retryAfter });
      } else if (r.error) {
        setNote(r.error);
      }
    });

  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate ref={form}>
      <input name="email" type="hidden" value={email} />
      {next && <input name="next" type="hidden" value={next} />}

      <div className="flex flex-col gap-1">
        <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[32px]">
          mark_email_read
        </span>
        <p className="font-headline-sm text-headline-sm text-primary">Check your email</p>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          We sent a 6-digit code to <strong className="text-primary break-all">{email}</strong>. Enter it below to finish creating your
          account. It can take a minute to arrive; check your spam folder too.
        </p>
      </div>

      <div className="flex flex-col gap-space-xs">
        <label className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant" htmlFor="code">
          Code
        </label>
        <input
          aria-describedby={error ? "code-error" : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="one-time-code"
          autoFocus
          className="h-14 w-full px-space-md bg-surface-container-lowest text-primary text-center font-mono text-[26px] tracking-[0.5em] rounded-lg ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none aria-invalid:ring-error"
          id="code"
          inputMode="numeric"
          maxLength={6}
          name="code"
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, "").slice(0, 6);
            e.target.value = digits;
            if (digits.length === 6 && !pending) form.current?.requestSubmit();
          }}
          pattern="\d{6}"
          placeholder="••••••"
          required
        />
        {error && (
          <p className="font-body-sm text-body-sm text-error" id="code-error" role="alert">
            {error}
          </p>
        )}
      </div>

      <button
        className="h-[52px] rounded-full bg-primary text-on-primary enabled:hover:bg-secondary-fixed enabled:hover:text-on-secondary-fixed disabled:opacity-60 transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md disabled:cursor-not-allowed"
        disabled={pending}
        type="submit"
      >
        {pending ? "Checking…" : "Verify & Create Account"}
      </button>

      <div className="flex items-center justify-between gap-space-sm font-body-sm text-body-sm">
        <button
          className="text-primary underline underline-offset-4 decoration-secondary enabled:hover:text-secondary disabled:no-underline disabled:text-on-surface-variant disabled:cursor-not-allowed tabular-nums"
          disabled={wait > 0 || sending}
          onClick={resendNow}
          type="button"
        >
          {sending ? "Sending…" : wait > 0 ? `Resend code in ${clock(wait)}` : "Resend code"}
        </button>
        <button className="text-on-surface-variant hover:text-primary underline underline-offset-4" onClick={() => onBack()} type="button">
          Change email
        </button>
      </div>
      {note && (
        <p className="font-body-sm text-body-sm text-on-error-container bg-error-container rounded-lg px-space-md py-space-sm" role="alert">
          {note}
        </p>
      )}
    </form>
  );
}
