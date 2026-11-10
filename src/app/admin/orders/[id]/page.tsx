import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { whatsappNumber } from "@/lib/data";
import { paymentMethodLabel } from "@/lib/orders";
import { getOrderById } from "@/lib/server/orders";
import { PaymentTag, StatusTag } from "@/components/admin/OrderTags";
import { NoteControl, PaymentControl, StatusControl } from "@/components/admin/OrderControls";
import { campaignOfCards } from "@/lib/server/coupons";
import { pkr } from "@/components/admin/format";
import { mailConfigured, siteUrl, statusLines } from "@/lib/server/mail";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { clearOrderHistory, deleteOrderEvent, deleteOrders } from "../../actions";

export const metadata = { title: "Order" };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });

/** wa.me link to message the customer (Pakistani numbers normalised to 92…). */
function whatsappTo(phone: string) {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) digits = `92${digits.slice(1)}`;
  return digits && digits !== whatsappNumber ? `https://wa.me/${digits}` : null;
}

async function AdminOrderContent({ params }: PageProps<"/admin/orders/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) notFound();
  // Surprise cards: the campaign they came from (older orders didn't store it).
  const couponCampaign = order.coupon
    ? (order.coupon.campaign ?? (await campaignOfCards([order.coupon.code])).get(order.coupon.code))
    : undefined;
  const country = countries.find((c) => c.code === order.address.country)?.label ?? order.address.country;
  const wa = whatsappTo(order.customer.phone);
  const base = await siteUrl();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="link muted" href="/admin/orders">
            ← Orders
          </Link>
          <h1 className="mt-1 flex items-center gap-3">
            {order.number} <StatusTag status={order.status} /> <PaymentTag status={order.payment.status} />
          </h1>
          <p className="muted">Placed {when(order.createdAt)}</p>
        </div>
        <form action={deleteOrders}>
          <input name="ids" type="hidden" value={order.id} />
          <ConfirmButton
            confirmLabel="Delete order"
            message="It will also disappear from the customer's account. This cannot be undone."
            title={`Delete order ${order.number}?`}
          >
            Delete order
          </ConfirmButton>
        </form>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        <div className="flex flex-col gap-4">
          <section className="panel">
            <h2 className="px-3 py-3 border-b border-[var(--a-line)]">Items</h2>
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th className="w-14" />
                    <th>Product</th>
                    <th>Size</th>
                    <th>Qty</th>
                    <th>Price each</th>
                    <th className="text-right">Line total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((i) => (
                    <tr key={`${i.slug}-${i.size}`}>
                      <td>
                        <div className="relative w-10 h-12 rounded overflow-hidden bg-surface-container">
                          <Image alt="" className="object-cover" fill sizes="40px" src={i.image} unoptimized />
                        </div>
                      </td>
                      <td>
                        <Link className="link" href={`/products/${i.slug}`} target="_blank">
                          {i.name}
                        </Link>
                      </td>
                      <td>EU {i.size}</td>
                      <td>{i.quantity}</td>
                      <td className="whitespace-nowrap">
                        {pkr(i.unitPrice)}
                        {i.discountPercent > 0 && (
                          <div className="muted text-xs">
                            <s>{pkr(i.listPrice)}</s> −{i.discountPercent}%
                          </div>
                        )}
                      </td>
                      <td className="text-right whitespace-nowrap">{pkr(i.unitPrice * i.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <dl className="px-3 py-3 border-t border-[var(--a-line)] grid grid-cols-[1fr_auto] gap-y-1">
              <dt className="muted">List price</dt>
              <dd className="text-right">{pkr(order.listTotal)}</dd>
              {order.discountTotal > 0 && (
                <>
                  <dt className="muted">Discount</dt>
                  <dd className="text-right">−{pkr(order.discountTotal)}</dd>
                </>
              )}
              {order.coupon && (
                <>
                  <dt className="muted">
                    Coupon{" "}
                    <Link className="tag tag-info hover:underline" href={`/admin/orders?coupon=${encodeURIComponent(couponCampaign ?? order.coupon.code)}`} title="Show every order with this coupon">
                      {couponCampaign ?? order.coupon.code}
                    </Link>
                    {couponCampaign && <span className="block text-xs">surprise card {order.coupon.code}</span>}
                  </dt>
                  <dd className="text-right">
                    {order.coupon.type === "free_delivery"
                      ? `Free delivery (−${pkr(order.coupon.discount)})`
                      : `−${pkr(order.coupon.discount)}`}
                  </dd>
                </>
              )}
              <dt className="muted">Delivery ({order.delivery.name})</dt>
              <dd className="text-right">{order.shippingFee ? pkr(order.shippingFee) : "Free"}</dd>
              <dt className="font-semibold">Total</dt>
              <dd className="text-right font-semibold">{pkr(order.total)}</dd>
            </dl>
          </section>

          <section className="panel p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2>History</h2>
              {order.history.length > 0 && (
                <form action={clearOrderHistory}>
                  <input name="id" type="hidden" value={order.id} />
                  <ConfirmButton
                    confirmLabel="Clear history"
                    message={`All ${order.history.length} entries for ${order.number} will be removed. This cannot be undone.`}
                    title="Clear order history?"
                  >
                    Clear history
                  </ConfirmButton>
                </form>
              )}
            </div>
            {order.history.length === 0 ? (
              <p className="muted">No history entries.</p>
            ) : (
              <ol className="flex flex-col gap-2">
                {order.history
                  .map((h, index) => ({ h, index }))
                  .reverse()
                  .map(({ h, index }) => (
                    <li key={`${h.at}-${index}`} className="flex items-start gap-3">
                      <span className="muted whitespace-nowrap text-xs pt-0.5 w-36 shrink-0">{when(h.at)}</span>
                      <span className="flex-1">
                        <span className="tag tag-muted mr-2">{h.kind}</span>
                        {h.text} <span className="muted text-xs">· {h.by}</span>
                      </span>
                      <form action={deleteOrderEvent}>
                        <input name="id" type="hidden" value={order.id} />
                        <input name="index" type="hidden" value={index} />
                        <input name="at" type="hidden" value={h.at} />
                        <ConfirmButton className="btn btn-danger h-7 px-2 text-xs" message={h.text} title="Delete this history entry?">
                          <span aria-hidden="true">×</span>
                          <span className="sr-only">Delete entry</span>
                        </ConfirmButton>
                      </form>
                    </li>
                  ))}
              </ol>
            )}
            <NoteControl orderId={order.id} />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section className="panel p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h2>Order status</h2>
              {wa && (
                <a
                  className="btn h-8 text-xs"
                  href={`${wa}?text=${encodeURIComponent(
                    [...statusLines(order), `Track your order: ${base}/account/orders/${order.number}`].join("\n"),
                  )}`}
                  rel="noopener noreferrer"
                  target="_blank"
                  title="Opens WhatsApp with the current status ready to send"
                >
                  WhatsApp update
                </a>
              )}
            </div>
            <p className="muted text-xs">
              {mailConfigured() ? "Customers are emailed on every status change." : "Email is not set up: use the WhatsApp update button to notify the customer."}
            </p>
            <StatusControl key={`${order.status}-${order.updatedAt}`} order={order} />
          </section>

          <section className="panel p-3 flex flex-col gap-3">
            <h2>Payment</h2>
            <p className="muted">Method: {paymentMethodLabel(order.payment.method)}</p>
            {order.payment.walletNumber && (
              <p>
                Wallet account:{" "}
                <a className="link font-medium" href={`tel:${order.payment.walletNumber}`}>
                  {order.payment.walletNumber}
                </a>
                <span className="muted text-xs block">
                  Send the payment request to this number, then mark the payment paid with the transaction ID (TID).
                </span>
              </p>
            )}
            <PaymentControl key={order.updatedAt} order={order} />
          </section>

          <section className="panel p-3 flex flex-col gap-1">
            <h2 className="mb-1">Customer</h2>
            <p className="font-medium">{order.customer.name}</p>
            <p>
              <a className="link" href={`mailto:${order.customer.email}?subject=${encodeURIComponent(`Your Ŕose Atelier order ${order.number}`)}`}>
                {order.customer.email}
              </a>
            </p>
            <p>
              <a className="link" href={`tel:${order.customer.phone.replace(/[^\d+]/g, "")}`}>
                {order.customer.phone}
              </a>
              {wa && (
                <>
                  {" · "}
                  <a className="link" href={wa} rel="noopener noreferrer" target="_blank">
                    WhatsApp
                  </a>
                </>
              )}
            </p>
            <p className="muted text-xs">{order.userId ? "Registered customer" : "Guest checkout"}</p>
          </section>

          <section className="panel p-3 flex flex-col gap-1">
            <h2 className="mb-1">Ship to</h2>
            <address className="not-italic">
              {order.address.line1}
              {order.address.line2 && <>, {order.address.line2}</>}
              <br />
              {order.address.city} {order.address.postalCode}
              <br />
              {country}
            </address>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function AdminOrder(props: PageProps<"/admin/orders/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminOrderContent {...props} />
    </Suspense>
  );
}
