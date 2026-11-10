import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  orderStatusLabel,
  orderStatuses,
  paymentMethodLabel,
  paymentStatusLabel,
  paymentStatuses,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/orders";
import { listOrders } from "@/lib/server/orders";
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

export default async function AdminOrders({
  searchParams,
}: PageProps<"/admin/orders">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const status = orderStatuses.find((s) => s === one(sp.status)) as
    OrderStatus | undefined;
  const payment = paymentStatuses.find((s) => s === one(sp.payment)) as
    PaymentStatus | undefined;
  const orders = await listOrders({ q, status, payment });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Orders</h1>
        <p className="muted">
          Confirm, pack, send and track every order. Times are Pakistan time.
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

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-[1fr_200px_auto] gap-2 items-end">
        {status && <input name="status" type="hidden" value={status} />}
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
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Filter
          </button>
          <Link className="btn" href="/admin/orders">
            Reset
          </Link>
        </div>
      </form>

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
                <th>Order</th>
                <th>Placed</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <input
                      aria-label={`Select order ${o.number}`}
                      form="bulk-orders"
                      name="ids"
                      type="checkbox"
                      value={o.id}
                    />
                  </td>
                  <td>
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
                  <td>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                  <td className="whitespace-nowrap">{pkr(o.total)}</td>
                  <td>
                    <PaymentTag status={o.payment.status} />
                    <div className="muted text-xs">
                      {paymentMethodLabel(o.payment.method)}
                    </div>
                  </td>
                  <td>
                    <StatusTag status={o.status} />
                  </td>
                  <td>
                    <div className="flex justify-end gap-2">
                      <Link className="btn" href={`/admin/orders/${o.id}`}>
                        Open
                      </Link>
                      <form action={deleteOrders}>
                        <input name="ids" type="hidden" value={o.id} />
                        <ConfirmButton
                          message="Its history is deleted too. This cannot be undone."
                          title={`Delete order ${o.number}?`}
                        >
                          Delete
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="muted">
        {orders.length} order(s)
        {orders.length === 500 ? " (showing latest 500)" : ""}
      </p>
    </div>
  );
}
