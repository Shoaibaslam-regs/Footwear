"use client";

import Link from "next/link";
import { useActionState } from "react";
import { adminLogin, type AuthState } from "@/lib/auth/actions";
import { tryAgainIn, useCooldown } from "@/lib/use-cooldown";

const label = "font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant";
const input =
  "h-12 w-full px-space-md bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none aria-invalid:ring-error";

/** The admin login step, shown after the admin secret is typed into the login form. */
export default function AdminLogin({ gate, onBack }: { gate: string; onBack: () => void }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(adminLogin, undefined);
  const wait = useCooldown(state?.retryAfter, state);
  const e = state?.errors;
  const timedOut = state && !state.admin && state.message;
  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      <input name="gate" type="hidden" value={state?.gate ?? gate} />
      <div className="flex items-center gap-space-xs">
        <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[24px]">admin_panel_settings</span>
        <p className="font-headline-sm text-headline-sm text-primary">Admin login</p>
      </div>
      {(["email", "password"] as const).map((name) => (
        <div key={name} className="flex flex-col gap-space-xs">
          <label className={label} htmlFor={`admin-${name}`}>
            {name === "email" ? "Admin email" : "Password"}
          </label>
          <input
            aria-invalid={e?.[name] ? true : undefined}
            autoComplete={name === "email" ? "username" : "current-password"}
            autoFocus={name === "email"}
            className={input}
            defaultValue={name === "email" ? state?.values?.email : undefined}
            id={`admin-${name}`}
            name={name}
            required
            type={name === "email" ? "email" : "password"}
          />
          {e?.[name] && <p className="font-body-sm text-body-sm text-error">{e[name]!.join(" ")}</p>}
        </div>
      ))}
      {state?.message && (
        <p className="font-body-sm text-body-sm text-on-error-container bg-error-container rounded-lg px-space-md py-space-sm" role="alert">
          {state.message}
        </p>
      )}
      {timedOut ? (
        <Link className="h-[52px] rounded-full bg-primary text-on-primary font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center" href="/login">
          Start again
        </Link>
      ) : (
        <button
          className="h-[52px] rounded-full bg-primary text-on-primary enabled:hover:bg-secondary-fixed enabled:hover:text-on-secondary-fixed disabled:opacity-60 transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md disabled:cursor-not-allowed tabular-nums"
          disabled={pending || wait > 0}
          type="submit"
        >
          {wait > 0 ? tryAgainIn(wait) : pending ? "Please wait…" : "Open Admin Panel"}
        </button>
      )}
      <button
        className="self-center font-body-sm text-body-sm text-on-surface-variant hover:text-primary underline underline-offset-4 decoration-secondary"
        onClick={onBack}
        type="button"
      >
        Not an admin? Log in as a customer
      </button>
    </form>
  );
}
