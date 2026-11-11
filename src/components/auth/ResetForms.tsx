"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestPasswordReset, resetPassword, type ResetState } from "@/lib/auth/actions";
import { tryAgainIn, useCooldown } from "@/lib/use-cooldown";

const label = "font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant";
const input =
  "h-12 w-full px-space-md bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none aria-invalid:ring-error";
const button =
  "h-[52px] rounded-full bg-primary text-on-primary enabled:hover:bg-secondary-fixed enabled:hover:text-on-secondary-fixed disabled:opacity-60 transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md disabled:cursor-not-allowed tabular-nums";

function Notice({ state }: { state: ResetState }) {
  if (state?.ok)
    return (
      <p className="font-body-sm text-body-sm bg-secondary-fixed/40 text-primary rounded-lg px-space-md py-space-sm" role="status">
        {state.ok}
      </p>
    );
  if (state?.message)
    return (
      <p className="font-body-sm text-body-sm text-on-error-container bg-error-container rounded-lg px-space-md py-space-sm" role="alert">
        {state.message}
      </p>
    );
  return null;
}

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, undefined);
  const wait = useCooldown(state?.retryAfter, state);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <div className="flex flex-col gap-space-xs">
        <label className={label} htmlFor="email">
          Email
        </label>
        <input aria-invalid={state?.errors?.email ? true : undefined} autoComplete="email" className={input} id="email" name="email" required type="email" />
        {state?.errors?.email && <p className="font-body-sm text-body-sm text-error">{state.errors.email.join(" ")}</p>}
      </div>
      <Notice state={state} />
      <button className={button} disabled={pending || wait > 0} type="submit">
        {wait > 0 ? tryAgainIn(wait) : pending ? "Sending…" : "Send Reset Link"}
      </button>
      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        Remembered it?{" "}
        <Link className="text-primary underline underline-offset-4 decoration-secondary" href="/login">
          Log in
        </Link>
      </p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  const e = state?.errors;
  const wait = useCooldown(state?.retryAfter, state);
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="token" type="hidden" value={token} />
      {(["password", "confirm"] as const).map((name) => (
        <div key={name} className="flex flex-col gap-space-xs">
          <label className={label} htmlFor={name}>
            {name === "password" ? "New password" : "Confirm new password"}
          </label>
          <input aria-invalid={e?.[name] ? true : undefined} autoComplete="new-password" className={input} id={name} name={name} required type="password" />
          {e?.[name] && <p className="font-body-sm text-body-sm text-error">{e[name]!.join(" ")}</p>}
        </div>
      ))}
      <Notice state={state} />
      <button className={button} disabled={pending || wait > 0} type="submit">
        {wait > 0 ? tryAgainIn(wait) : pending ? "Saving…" : "Save New Password"}
      </button>
    </form>
  );
}
