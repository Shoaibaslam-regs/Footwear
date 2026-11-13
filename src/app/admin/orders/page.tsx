import { Fragment, Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  etaLabel,
  inQueue,
  orderStatusLabel,
  orderStatuses,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatuses,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { listOrders, queuePositions } from "@/lib/server/orders";
import { pkToday } from "@/lib/server/attention";
import { io } from "next/cache";
import { campaignOfCards, couponFilterOptions, orderCodesFor } from "@/lib/server/coupons";
import { PaymentTag, StatusTag } from "@/components/admin/OrderTags";
import { pkr } from "@/components/admin/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SelectAll from "@/components/admin/SelectAll";
import { deleteOrders } from "../actions";

export const metadata = { title: "Orders" };

const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });

async function AdminOrdersContent({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const status = orderStatuses.find((s) => s === one(sp.status)) as
    OrderStatus | undefined;
  const payment = paymentStatuses.find((s) => s === one(sp.payment)) as
    PaymentStatus | undefined;
  // Coupon filter: any / none / one code (a surprise campaign matches all its cards).
  const couponParam = one(sp.coupon)?.trim().toUpperCase() || "";
  const couponFilter =
    couponParam === "ANY" ? "any" : couponParam === "NONE" ? "none" : couponParam ? await orderCodesFor(couponParam) : undefined;
  const sort = (["queue", "newest", "oldest"] as const).find((v) => v === one(sp.sort)) ?? "queue";
  // From "Needs attention": waiting orders without an expected date, or open ones past it.
  const etaParam = one(sp.eta) === "late" ? "late" : one(sp.eta) === "none" ? "none" : undefined;
  if (etaParam === "late") await io(); // compares with today's date
  const eta = etaParam === "late" ? { lateBefore: pkToday() } : etaParam === "none" ? ({ missing: true } as const) : undefined;
  const [orders, couponOptions, queue] = await Promise.all([
    listOrders({ q, status, payment, coupon: couponFilter, sort, eta }),
    couponFilterOptions(),
    queuePositions(),
  ]);
  // Queue view: a divider row where the orders still to be sent end.
  const firstDone = sort === "queue" ? orders.findIndex((o) => !inQueue(o.status)) : -1;
  const waitingShown = sort === "queue" ? orders.filter((o) => inQueue(o.status)).length : 0;
  // Campaign of each surprise card (older orders didn't store it).
  const campaignOf = await campaignOfCards([...new Set(orders.flatMap((o) => (o.coupon && !o.coupon.campaign ? [o.coupon.code] : [])))]);
  const withCoupon = orders.filter((o) => o.coupon && o.status !== "cancelled");
  const couponSaving = withCoupon.reduce((n, o) => n + (o.coupon?.discount ?? 0), 0);
  const couponSales = withCoupon.reduce((n, o) => n + o.total, 0);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Orders</h1>
        <p className="muted">
          {sort === "queue"
            ? `First come, first served: the oldest order still to be sent is at the top, new orders join the bottom. ${queue.total} ${queue.total === 1 ? "order is" : "orders are"} waiting to be sent.`
            : "Confirm, pack, send and track every order."}{" "}
          Times are Pakistan time.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          aria-current={!status ? "page" : undefined}
          className="pill"
          href="/admin/orders"
        >
          All
        </Link>
        {orderStatuses.map((s) => (
          <Link
            key={s}
            aria-current={status === s ? "page" : undefined}
            className="pill"
            href={`/admin/orders?status=${s}`}
          >
            {orderStatusLabel[s]}
          </Link>
        ))}
      </div>

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1fr_160px_180px_190px_auto] gap-2 items-end">
        {status && <input name="status" type="hidden" value={status} />}
        {etaParam && <input name="eta" type="hidden" value={etaParam} />}
        <label className="field">
          Search
          <input
            className="input"
            defaultValue={q}
            name="q"
            placeholder="Order number, name, email, phone or coupon"
            type="search"
          />
        </label>
        <label className="field">
          Payment
          <select defaultValue={payment ?? ""} name="payment">
            <option value="">Any</option>
            {paymentStatuses.map((s) => (
              <option key={s} value={s}>
                {paymentStatusLabel[s]}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Coupon
          <select defaultValue={couponParam ? (["ANY", "NONE"].includes(couponParam) ? couponParam.toLowerCase() : couponParam) : ""} name="coupon">
            <option value="">Any order</option>
            <option value="any">Used a coupon</option>
            <option value="none">No coupon</option>
            {couponOptions.length > 0 && (
              <optgroup label="One coupon">
                {couponOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
        </label>
        <label className="field">
          Order
          <select defaultValue={sort} name="sort">
            <option value="queue">Queue (first come)</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Filter
          </button>
          <Link className="btn" href="/admin/orders">
            Reset
          </Link>
        </div>
      </form>

      {couponParam && couponParam !== "NONE" && (
        <p className="notice" role="status">
          <strong>{withCoupon.length}</strong> {withCoupon.length === 1 ? "order" : "orders"} {couponParam === "ANY" ? "with a coupon" : `with ${couponParam}`}{" "}
          (not counting cancelled) · <strong>{pkr(couponSales)}</strong> in sales · <strong>{pkr(couponSaving)}</strong> discount given.
        </p>
      )}

      {etaParam && (
        <p className="notice flex flex-wrap items-center justify-between gap-2" role="status">
          <span>
            Showing {etaParam === "late" ? "orders past their expected delivery date" : "waiting orders with no expected delivery date"} ({orders.length}).
          </span>
          <Link className="link" href="/admin/orders">
            Show all orders
          </Link>
        </p>
      )}

      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          {one(sp.deleted) === "1"
            ? "Order deleted."
            : `${one(sp.deleted)} orders deleted.`}
        </p>
      )}

      <form
        action={deleteOrders}
        className="flex items-center justify-between gap-2"
        id="bulk-orders"
      >
        <span className="muted">
          Deleting an order also removes it from the customer&apos;s account
          history.
        </span>
        <ConfirmButton
          confirmLabel="Delete orders"
          message="They will also disappear from customers' accounts. This cannot be undone."
          selectionForm="bulk-orders"
          title="Delete {n} selected order(s)?"
        >
          Delete selected
        </ConfirmButton>
      </form>

      {orders.length === 0 ? (
        <div className="empty">
          No orders match these filters
          <span className="muted">
            Orders appear here as soon as customers check out.
          </span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-8">
                  <SelectAll form="bulk-orders" label="Select all orders" />
                </th>
                <th className="text-right" title="Place in the queue: 1 is the oldest order still to be sent">Queue</th>
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Coupon</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, i) => (
                <Fragment key={o.id}>
                {i === firstDone && i > 0 && (
                  <tr>
                    <td className="bg-[var(--a-hover)] text-xs font-semibold muted py-2" colSpan={10}>
                      Sent and finished orders (newest first)
                    </td>
                  </tr>
                )}
                <tr>
                  <td>
                    <input
                      aria-label={`Select order ${o.number}`}
                      form="bulk-orders"
                      name="ids"
                      type="checkbox"
                      value={o.id}
                    />
                  </td>
                  <td className="text-right tabular-nums">
                    {queue.positions.has(o.id) ? <span className="tag tag-muted">#{queue.positions.get(o.id)}</span> : <span className="muted">—</span>}
                  </td>
                  <td className="whitespace-nowrap">
                    <Link
                      className="link font-medium"
                      href={`/admin/orders/${o.id}`}
                    >
                      {o.number}
                    </Link>
                  </td>
                  <td className="muted whitespace-nowrap">
                    {when(o.createdAt)}
                  </td>
                  <td>
                    {o.customer.name}
                    <div className="muted text-xs">{o.customer.email}</div>
                  </td>
                  <td className="whitespace-nowrap">
                    {pkr(o.total)}
                    <div className="muted text-xs">
                      {(() => {
                        const pairs = o.items.reduce((n, i) => n + i.quantity, 0);
                        return `${pairs} ${pairs === 1 ? "pair" : "pairs"}`;
                      })()}
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {o.coupon ? (
                      <>
                        <Link
                          className="tag tag-info hover:underline"
                          href={`/admin/orders?coupon=${encodeURIComponent(o.coupon.campaign ?? campaignOf.get(o.coupon.code) ?? o.coupon.code)}`}
                          title="Show every order with this coupon"
                        >
                          {o.coupon.campaign ?? campaignOf.get(o.coupon.code) ?? o.coupon.code}
                        </Link>
                        <div className="muted text-xs">{o.coupon.type === "free_delivery" ? "free delivery" : `−${pkr(o.coupon.discount)}`}</div>
                        {(o.coupon.campaign ?? campaignOf.get(o.coupon.code)) && <div className="muted text-xs">card {o.coupon.code}</div>}
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <PaymentTag status={o.payment.status} />
                    <div className="muted text-xs">
                      {paymentMethodLabel(o.payment.method)}
                    </div>
                    {o.codeConfirmed && (
                      <span className="tag tag-ok mt-0.5" title="The customer entered the code we emailed before this Cash on Delivery order was placed">
                        Email confirmed
                      </span>
                    )}
                  </td>
                  <td>
                    <StatusTag status={o.status} />
                    {o.eta && o.status !== "delivered" && o.status !== "cancelled" && (
                      <div className="muted text-xs whitespace-nowrap">Arrives {etaLabel(o.eta)}</div>
                    )}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <Link className="btn btn-sm" href={`/admin/orders/${o.id}`}>
                        Open
                      </Link>
                      <form action={deleteOrders}>
                        <input name="ids" type="hidden" value={o.id} />
                        <ConfirmButton
                          className="btn btn-sm btn-danger"
                          message="Its history is deleted too. This cannot be undone."
                          title={`Delete order ${o.number}?`}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        {orders.length} order(s)
        {sort === "queue" && waitingShown > 0 ? ` · ${waitingShown} waiting to be sent` : ""}
        {orders.length >= 500 ? " (showing up to 500 sent and finished)" : ""}
      </p>
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function AdminOrders(props: PageProps<"/admin/orders">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminOrdersContent {...props} />
    </Suspense>
  );
}
