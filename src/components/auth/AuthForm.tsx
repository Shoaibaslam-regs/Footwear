"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, register, type AuthState } from "@/lib/auth/actions";

const label =
  "font-label-uppercase text-label-uppercase uppercase tracking-wider text-on-surface-variant";
const input =
  "h-12 w-full px-space-md bg-surface-container-lowest text-on-surface font-body-md text-body-md rounded-lg ring-1 ring-outline-variant/60 focus:ring-2 focus:ring-secondary focus:outline-none transition-shadow aria-invalid:ring-error";

function Field({
  name,
  type = "text",
  label: text,
  autoComplete,
  defaultValue,
  errors,
}: {
  name: string;
  type?: string;
  label: string;
  autoComplete: string;
  defaultValue?: string;
  errors?: string[];
}) {
  const errId = `${name}-error`;
  return (
    <div className="flex flex-col gap-space-xs">
      <label className={label} htmlFor={name}>
        {text}
      </label>
      <input
        aria-describedby={errors ? errId : undefined}
        aria-invalid={errors ? true : undefined}
        autoComplete={autoComplete}
        className={input}
        defaultValue={defaultValue}
        id={name}
        name={name}
        required
        type={type}
      />
      {errors && (
        <p className="font-body-sm text-body-sm text-error" id={errId}>
          {errors.join(" ")}
        </p>
      )}
    </div>
  );
}

export default function AuthForm({
  mode,
  next,
}: {
  mode: "login" | "register";
  next?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    mode === "login" ? login : register,
    undefined,
  );
  const isLogin = mode === "login";
  const e = state?.errors;
  const otherHref = `${isLogin ? "/register" : "/login"}${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form action={action} className="flex flex-col gap-space-md" noValidate>
      {next && <input name="next" type="hidden" value={next} />}
      {!isLogin && (
        <Field
          autoComplete="name"
          defaultValue={state?.values?.name}
          errors={e?.name}
          label="Full Name"
          name="name"
        />
      )}
      <Field
        autoComplete="email"
        defaultValue={state?.values?.email}
        errors={e?.email}
        label="Email"
        name="email"
        type="email"
      />
      <Field
        autoComplete={isLogin ? "current-password" : "new-password"}
        errors={e?.password}
        label="Password"
        name="password"
        type="password"
      />
      {!isLogin && (
        <Field
          autoComplete="new-password"
          errors={e?.confirm}
          label="Confirm Password"
          name="confirm"
          type="password"
        />
      )}

      {isLogin && (
        <Link className="self-end -mt-space-xs font-body-sm text-body-sm text-on-surface-variant hover:text-primary underline underline-offset-4" href="/forgot-password">
          Forgot password?
        </Link>
      )}

      {state?.message && (
        <p
          className="font-body-sm text-body-sm text-on-error-container bg-error-container rounded-lg px-space-md py-space-sm"
          role="alert"
        >
          {state.message}
        </p>
      )}

      <button
        className="h-[52px] mt-space-xs rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed disabled:opacity-60 transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md"
        disabled={pending}
        type="submit"
      >
        {pending ? "Please wait…" : isLogin ? "Sign In" : "Create Account"}
      </button>

      <p className="font-body-sm text-body-sm text-on-surface-variant text-center">
        {isLogin ? "New to Maison ÉLORA? " : "Already a client? "}
        <Link
          className="text-primary underline underline-offset-4 decoration-secondary hover:text-secondary"
          href={otherHref}
        >
          {isLogin ? "Create an account" : "Sign in"}
        </Link>
      </p>
    </form>
  );
}
