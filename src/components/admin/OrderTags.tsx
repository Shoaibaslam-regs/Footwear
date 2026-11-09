import { orderStatusLabel, paymentStatusLabel, type OrderStatus, type PaymentStatus } from "@/lib/orders";

const statusTone: Record<OrderStatus, string> = {
  pending: "tag-warn",
  confirmed: "tag-info",
  processing: "tag-info",
  shipped: "tag-info",
  out_for_delivery: "tag-info",
  delivered: "tag-ok",
  cancelled: "tag-bad",
};
const paymentTone: Record<PaymentStatus, string> = {
  pending: "tag-warn",
  paid: "tag-ok",
  failed: "tag-bad",
  refunded: "tag-muted",
};

export function StatusTag({ status }: { status: OrderStatus }) {
  return <span className={`tag ${statusTone[status]}`}>{orderStatusLabel[status]}</span>;
}

export function PaymentTag({ status }: { status: PaymentStatus }) {
  return <span className={`tag ${paymentTone[status]}`}>{paymentStatusLabel[status]}</span>;
}
