"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { resendRegistrationCode, verifyRegistration, type AuthState } from "@/lib/auth/actions";
import { clock, useCooldown } from "@/lib/use-cooldown";
import { showToast } from "@/lib/toast";

const DIGITS = 6;
const RESEND_SECONDS = 60;
/** Matches OTP.codeMinutes on the server (lib/server/email-otp.ts). */
const VALID_SECONDS = 10 * 60;

/** "sa•••a@gmail.com": enough to recognise, without spelling it out. */
export function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const shown = name.length <= 3 ? name.slice(0, 1) : name.slice(0, 2);
  return `${shown}•••${name.length > 3 ? name.slice(-1) : ""}@${domain}`;
}

/**
 * Six boxes, one digit each. Typing moves to the next box, Backspace to the
 * previous one, and pasting (or the phone's code autofill) fills them all.
 * The joined code goes in a hidden `code` field.
 */
export function CodeBoxes({ invalid, onComplete }: { invalid: boolean; onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(() => Array(DIGITS).fill(""));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const code = digits.join("");

  const fill = (from: number, text: string) => {
    const incoming = text.replace(/\D/g, "").slice(0, DIGITS - from).split("");
    if (incoming.length === 0) return;
    const next = [...digits];
    incoming.forEach((d, k) => (next[from + k] = d));
    setDigits(next);
    boxes.current[Math.min(from + incoming.length, DIGITS - 1)]?.focus();
    if (next.every(Boolean)) onComplete(next.join(""));
  };

  return (
    <div className="flex flex-col gap-space-xs">
      <input name="code" type="hidden" value={code} />
      <div aria-label="6-digit code" className="grid grid-cols-6 gap-1.5 sm:gap-2.5" role="group">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            aria-invalid={invalid || undefined}
            aria-label={`Digit ${i + 1} of ${DIGITS}`}
            autoComplete={i === 0 ? "one-time-code" : "off"}
            autoFocus={i === 0}
            className="w-full aspect-[4/5] max-h-16 min-w-0 rounded-lg bg-surface-container-lowest text-center font-headline-sm text-[24px] sm:text-[28px] text-primary ring-1 ring-outline-variant/70 shadow-[0_1px_3px_rgba(0,0,0,0.06)] focus:ring-2 focus:ring-secondary focus:outline-none aria-invalid:ring-error caret-secondary transition-shadow"
            inputMode="numeric"
            maxLength={DIGITS}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "");
              if (v.length > 1) return fill(i, v); // paste or autofill
              const next = [...digits];
              next[i] = v;
              setDigits(next);
              if (v && i < DIGITS - 1) boxes.current[i + 1]?.focus();
              if (next.every(Boolean)) onComplete(next.join(""));
            }}
            onFocus={(e) => e.target.select()}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) {
                e.preventDefault();
                const next = [...digits];
                next[i - 1] = "";
                setDigits(next);
                boxes.current[i - 1]?.focus();
              } else if (e.key === "ArrowLeft" && i > 0) {
                boxes.current[i - 1]?.focus();
              } else if (e.key === "ArrowRight" && i < DIGITS - 1) {
                boxes.current[i + 1]?.focus();
              }
            }}
            onPaste={(e) => {
              e.preventDefault();
              fill(i, e.clipboardData.getData("text"));
            }}
            pattern="\d*"
            type="text"
            value={d}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Sign-up, step 2: the 6-digit code from the email, as a card of its own.
 * The last digit submits by itself. "Resend code" is locked for a minute after each send.
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
  const lastSent = useRef("");
  const [resend, setResend] = useState<{ s: number }>({ s: RESEND_SECONDS });
  const resendWait = useCooldown(resend.s, resend);
  const [valid, setValid] = useState<{ s: number }>({ s: VALID_SECONDS });
  const validLeft = useCooldown(valid.s, valid);
  const [sending, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);

  // The sign-up expired: back to the form with the reason.
  useEffect(() => {
    if (state?.restart) onBack(state.message);
  }, [state, onBack]);

  const error = state?.errors?.code?.join(" ") ?? (state?.restart ? undefined : state?.message);

  const submitCode = (code: string) => {
    if (pending || code === lastSent.current) return;
    lastSent.current = code;
    // Let React commit the last digit into the hidden field first.
    requestAnimationFrame(() => form.current?.requestSubmit());
  };

  const resendNow = () =>
    start(async () => {
      setNote(null);
      const r = await resendRegistrationCode(email);
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

  return (
    <form action={action} className="flex flex-col gap-space-md text-center" id="otp-card" noValidate ref={form}>
      <input name="email" type="hidden" value={email} />
      {next && <input name="next" type="hidden" value={next} />}

      <div className="flex flex-col items-center gap-space-xs">
        <span className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center shadow-inner">
          <span aria-hidden="true" className="material-symbols-outlined icon-filled text-secondary text-[26px]">
            lock
          </span>
        </span>
        <span className="mt-space-xs font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-[0.24em] text-secondary">
          Ŕose Atelier · Email check
        </span>
        <h1 className="font-headline-md text-headline-md sm:font-headline-lg-mobile sm:text-headline-lg-mobile text-primary tracking-tight">
          Confirm your email
        </h1>
        <p className="font-body-sm text-body-sm text-on-surface-variant max-w-sm">
          We sent a 6-digit code to <strong className="text-primary font-semibold break-all">{maskEmail(email)}</strong>. Enter it below to
          finish creating your account.
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
          <button className="underline underline-offset-4 decoration-secondary hover:text-primary" onClick={() => onBack()} type="button">
            Change email
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
        {pending ? "Checking…" : "Verify & Create Account"}
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
      <p className="font-body-sm text-[12px] text-on-surface-variant">Can&apos;t find it? Check your spam folder.</p>
    </form>
  );
}
