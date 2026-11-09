/** Shared (client-safe) site configuration types. */

export type DeliveryOption = {
  id: string;
  name: string;
  /** e.g. "2–4 working days" */
  eta: string;
  description: string;
  /** PKR added to the order (0 = free). */
  fee: number;
};

export const POLICY_PAGES = [
  { slug: "shipping-returns", title: "Delivery & Returns" },
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "terms", title: "Terms & Conditions" },
] as const;
export type PolicySlug = (typeof POLICY_PAGES)[number]["slug"];
