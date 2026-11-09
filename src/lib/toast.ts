/** Fire-and-forget toast message, picked up by <ActionToast />. */
export function showToast(message: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("elora:toast", { detail: message }));
}
