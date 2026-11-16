/**
 * Keys that spot the same person behind different spellings, for limits that
 * must not be dodged with a new account (one account per inbox, one coupon per
 * phone number).
 */

/**
 * The inbox an address really reaches. Gmail ignores dots and anything after
 * "+", and googlemail.com is gmail.com, so a.yesha+2@gmail.com is
 * ayesha@gmail.com. Other providers: only the "+tag" is dropped.
 */
export function emailKey(email: string): string {
  const e = email.trim().toLowerCase();
  const at = e.lastIndexOf("@");
  if (at < 1) return e;
  let local = e.slice(0, at).split("+")[0];
  let domain = e.slice(at + 1);
  if (domain === "googlemail.com") domain = "gmail.com";
  if (domain === "gmail.com") local = local.replace(/\./g, "");
  return `${local}@${domain}`;
}

/** A Pakistani phone number as 03XXXXXXXXX (other numbers: their digits), so "+92 300-1234567" = "03001234567". */
export function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0092")) return `0${digits.slice(4)}`;
  if (digits.startsWith("92") && digits.length === 12) return `0${digits.slice(2)}`;
  return digits;
}
