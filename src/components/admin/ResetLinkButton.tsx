"use client";

import { useActionState, useState } from "react";
import { createUserResetLink, type ResetLinkState } from "@/app/admin/actions";

/** Creates a one-hour password reset link to send to a client (e.g. on WhatsApp). */
export default function ResetLinkButton({ userId, name }: { userId: string; name: string }) {
  const [state, action, pending] = useActionState<ResetLinkState, FormData>(createUserResetLink, undefined);
  const [copied, setCopied] = useState(false);
  const message = state?.link
    ? `Hello ${name.split(" ")[0]}, here is your Ŕose Atelier password reset link (valid for 1 hour): ${state.link}`
    : "";
  return (
    <div className="flex flex-col items-end gap-1">
      <form action={action}>
        <input name="id" type="hidden" value={userId} />
        <button className="btn" disabled={pending} type="submit">
          {pending ? "…" : "Reset link"}
        </button>
      </form>
      {state?.error && <span className="error text-xs">{state.error}</span>}
      {state?.link && (
        <div className="flex gap-1">
          <button
            className="btn h-8 text-xs"
            onClick={async () => {
              await navigator.clipboard.writeText(state.link!);
              setCopied(true);
            }}
            type="button"
          >
            {copied ? "Copied" : "Copy link"}
          </button>
          <a className="btn h-8 text-xs" href={`https://wa.me/?text=${encodeURIComponent(message)}`} rel="noopener noreferrer" target="_blank">
            WhatsApp
          </a>
        </div>
      )}
    </div>
  );
}
