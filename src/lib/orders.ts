import type { CouponType } from "./coupons";

/** Order model shared by checkout, the account page and the admin panel. */

export const orderStatuses = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const orderStatusLabel: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Allowed moves in the fulfilment workflow. */
export const nextStatuses: Record<OrderStatus, OrderStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
  delivered: [],
  cancelled: [],
};

/** The customer-facing progress line (cancelled is shown separately). */
export const fulfilmentSteps: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "out_for_delivery",
  "delivered",
];

export const paymentMethods = [
  {
    value: "cod",
    label: "Cash on Delivery",
    description: "Pay the courier in cash when your order arrives.",
    wallet: false,
  },
  {
    value: "easypaisa",
    label: "EasyPaisa",
    description: "We send a payment request to your EasyPaisa account once your order is confirmed.",
    wallet: true,
  },
  {
    value: "jazzcash",
    label: "JazzCash",
    description: "We send a payment request to your JazzCash account once your order is confirmed.",
    wallet: true,
  },
  {
    value: "bank",
    label: "Bank Transfer",
    description: "We send you our bank details once your order is confirmed.",
    wallet: false,
  },
  {
    value: "card_link",
    label: "Debit / Credit Card",
    description: "After we confirm your order, we email you a safe link to pay by card. You do not enter card details on this website.",
    wallet: false,
  },
] as const;
/**
 * What checkout offers today: Cash on Delivery only. The other methods stay
 * above so older orders keep their labels; add a value here to offer one again.
 */
export const checkoutMethodValues: readonly PaymentMethod[] = ["cod"];
export const checkoutMethods = paymentMethods.filter((m) => checkoutMethodValues.includes(m.value));
/** Methods that need the client's mobile-wallet number. */
export const isWalletMethod = (m: string) => paymentMethods.some((p) => p.value === m && p.wallet);
export type PaymentMethod = (typeof paymentMethods)[number]["value"];
export const paymentMethodLabel = (m: PaymentMethod) =>
  paymentMethods.find((p) => p.value === m)?.label ?? m;

export const paymentStatuses = ["pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
export const paymentStatusLabel: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  paid: "Paid",
  failed: "Failed",
  refunded: "Refunded",
};

export type OrderItem = {
  slug: string;
  name: string;
  size: number;
  quantity: number;
  /** What the customer paid per pair (PKR, after discount). */
  unitPrice: number;
  /** List price per pair before discount (PKR). */
  listPrice: number;
  discountPercent: number;
  /** The sale event this price came from ("11.11 Sale"), when a sale's discount applied. */
  sale?: { id: string; name: string };
  image: string;
  alt: string;
};

export type OrderEvent = {
  at: string;
  kind: "status" | "payment" | "note" | "tracking";
  text: string;
  by: string;
};

export type Order = {
  id: string;
  number: string;
  userId: string | null;
  customer: { name: string; email: string; phone: string };
  address: { line1: string; line2: string; city: string; postalCode: string; country: string };
  items: OrderItem[];
  /** Sum of list prices (PKR). */
  listTotal: number;
  /** Discount given (PKR). */
  discountTotal: number;
  /** Delivery fee actually charged (0 when a free-delivery coupon was used). */
  shippingFee: number;
  total: number;
  /** Coupon used on this order: `discount` is PKR saved (items, or the delivery fee for free delivery). */
  coupon?: { code: string; type: CouponType; discount: number; /** Surprise campaign the card came from. */ campaign?: string };
  delivery: { id: string; name: string };
  payment: {
    method: PaymentMethod;
    status: PaymentStatus;
    reference: string;
    /** EasyPaisa / JazzCash account number, e.g. 03XXXXXXXXX. */
    walletNumber?: string;
  };
  status: OrderStatus;
  trackingNumber: string;
  /** Expected delivery the store told the customer (Pakistan calendar days). */
  eta?: OrderEta;
  /** Cash on Delivery confirmed with an email code before it was placed. */
  codeConfirmed?: boolean;
  history: OrderEvent[];
  createdAt: string;
  updatedAt: string;
};

/* ---------- Order queue and expected delivery ---------- */

/**
 * Orders still waiting to be sent, served first come, first served: the
 * oldest is at the top of the admin queue and new orders join at the bottom.
 */
export const queueStatuses: OrderStatus[] = ["pending", "confirmed", "processing"];
export const inQueue = (s: OrderStatus) => queueStatuses.includes(s);

/** Expected delivery, as days `YYYY-MM-DD` in Pakistan time. `to` equals `from` for a single day. */
export type OrderEta = { from: string; to: string; note?: string; setAt: string };

/** Ready-made choices on the admin order page: "arrives in 4–5 days". */
export const etaPresets = [
  { id: "1-2", from: 1, to: 2 },
  { id: "2-3", from: 2, to: 3 },
  { id: "3-5", from: 3, to: 5 },
  { id: "4-5", from: 4, to: 5 },
  { id: "5-7", from: 5, to: 7 },
  { id: "7-10", from: 7, to: 10 },
] as const;

/** Reasons the admin can pick; shown to the customer next to the date. */
export const etaReasons = [
  "Many orders right now, so it is taking a little longer.",
  "Your pair is being made by hand.",
  "Courier delays in your area.",
  "Public holiday.",
];

const day = (ymd: string) => new Date(`${ymd}T00:00:00Z`);
const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => d.toLocaleDateString("en-GB", { ...o, timeZone: "UTC" });

/** "Fri 15 Nov", "15–16 Nov", or "30 Nov – 2 Dec" (no year, as everywhere on the storefront). */
export function etaLabel(eta: Pick<OrderEta, "from" | "to">): string {
  const a = day(eta.from);
  const b = day(eta.to);
  if (eta.from === eta.to) return fmt(a, { weekday: "short", day: "numeric", month: "short" });
  if (a.getUTCMonth() === b.getUTCMonth()) return `${a.getUTCDate()}–${fmt(b, { day: "numeric", month: "short" })}`;
  return `${fmt(a, { day: "numeric", month: "short" })} – ${fmt(b, { day: "numeric", month: "short" })}`;
}

/** One sentence for emails and WhatsApp: "Expected delivery: 15–16 Nov. Many orders right now, …" */
export function etaSentence(eta: OrderEta): string {
  return `Expected delivery: ${etaLabel(eta)}.${eta.note ? ` ${eta.note}` : ""}`;
}
