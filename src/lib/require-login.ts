"use client";

import { confirmDialog } from "@/components/Dialogs";

/** Router push, registered by <DialogHost /> (which lives in the root layout). */
let navigate: (href: string) => void = () => {};
export function setLoginNavigator(fn: (href: string) => void) {
  navigate = fn;
}

async function isSignedIn(): Promise<boolean> {
  try {
    const res = await fetch("/api/session", { cache: "no-store", credentials: "same-origin" });
    return res.ok && (await res.json()).signedIn === true;
  } catch {
    return false;
  }
}

/**
 * Gate for bag, wishlist and checkout actions.
 * Resolves true when signed in; otherwise offers sign-in and resolves false.
 * `next` defaults to the current page, so the client comes straight back.
 */
export async function requireLogin(action: string, next?: string): Promise<boolean> {
  if (await isSignedIn()) return true;
  const back = next ?? `${window.location.pathname}${window.location.search}`;
  const signIn = await confirmDialog({
    title: "Sign in to continue",
    message: `Please sign in or create a free account to ${action}.`,
    confirmLabel: "Sign In",
    cancelLabel: "Not Now",
    icon: "person",
  });
  if (signIn) navigate(`/login?next=${encodeURIComponent(back)}`);
  return false;
}
