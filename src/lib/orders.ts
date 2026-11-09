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
  shippingFee: number;
  total: number;
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
  history: OrderEvent[];
  createdAt: string;
  updatedAt: string;
};
