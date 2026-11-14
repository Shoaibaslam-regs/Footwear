import { isWalletMethod } from "./orders";

/**
 * Which checkout steps are filled in, from the form as it stands. These are
 * the same rules `placeOrder` checks on the server (app/(shop)/checkout/actions.ts),
 * so a ticked step is one the server will accept.
 */
export type StepsDone = { contact: boolean; address: boolean; delivery: boolean; payment: boolean };

const filled = (v: FormDataEntryValue | null) => typeof v === "string" && v.trim().length > 0;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^[+()\d\s-]{7,20}$/;
const WALLET = /^03\d{9}$/;

export function checkoutProgress(fd: FormData): StepsDone {
  const get = (k: string) => fd.get(k);
  const method = String(get("paymentMethod") ?? "");
  const wallet = String(get("walletNumber") ?? "")
    .replace(/[\s-]/g, "")
    .replace(/^\+?92/, "0");
  return {
    contact: filled(get("name")) && EMAIL.test(String(get("email") ?? "").trim()),
    address:
      PHONE.test(String(get("phone") ?? "").trim()) &&
      filled(get("line1")) &&
      filled(get("city")) &&
      filled(get("postalCode")) &&
      filled(get("country")),
    delivery: filled(get("delivery")),
    payment: filled(method) && (!isWalletMethod(method) || WALLET.test(wallet)),
  };
}

/** Steps 1–4 in order; a step counts only when it and every step before it are done. */
export function stepsCompleted(done: StepsDone): number {
  const order = [done.contact, done.address, done.delivery, done.payment];
  const first = order.indexOf(false);
  return first === -1 ? order.length : first;
}
