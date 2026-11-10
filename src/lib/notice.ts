/** A notification that slides down from the top (picked up by <TopNotice />). Used for coupon moments. */
export type Notice = { title: string; message?: string; icon?: string };

export function showNotice(notice: Notice) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<Notice>("rose:notice", { detail: notice }));
}
