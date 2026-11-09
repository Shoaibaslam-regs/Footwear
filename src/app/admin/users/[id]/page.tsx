import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getUserDetail } from "@/lib/server/insights";
import { paymentMethodLabel } from "@/lib/orders";
import { PaymentTag, StatusTag } from "@/components/admin/OrderTags";
import { date, pkr } from "@/components/admin/format";
import UserActions from "@/components/admin/UserActions";

export const metadata = { title: "Customer" };

/** wa.me link for a Pakistani number (03XXXXXXXXX → 923XXXXXXXXX). */
const whatsapp = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  const intl = d.startsWith("0") ? `92${d.slice(1)}` : d;
  return `https://wa.me/${intl}`;
};

export default async function AdminUserPage({ params }: PageProps<"/admin/users/[id]">) {
  const me = await requireAdmin();
  const { id } = await params;
  const u = await getUserDetail(id);
  if (!u) notFound();

  const live = u.orders.filter((o) => o.status !== "cancelled");
  const spent = live.reduce((n, o) => n + o.total, 0);
  const pairs = live.reduce((n, o) => n + o.items.reduce((m, it) => m + it.quantity, 0), 0);
  const open = u.orders.filter((o) => !["delivered", "cancelled"].includes(o.status)).length;
  const unpaid = live.filter((o) => o.payment.status === "pending").reduce((n, o) => n + o.total, 0);
  const bagValue = u.cart.bag.reduce((n, l) => n + l.price * l.quantity, 0);
  const a = u.savedAddress;
  const self = u.id === me.id;

  const tiles = [
    { label: "Orders", value: String(u.orders.length), hint: open ? `${open} in progress` : "None in progress" },
    { label: "Spent", value: pkr(spent), hint: `${pairs} ${pairs === 1 ? "pair" : "pairs"}, cancelled excluded` },
    { label: "Average order", value: pkr(live.length ? Math.round(spent / live.length) : 0), hint: `${live.length} not cancelled` },
    { label: "Awaiting payment", value: pkr(unpaid), hint: unpaid ? "Not yet marked paid" : "Nothing outstanding" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Link className="link muted" href="/admin/users">
            ← Users
          </Link>
          <h1 className="mt-1 flex flex-wrap items-center gap-2">
            {u.name}
            <span className={`tag ${u.role === "admin" ? "tag-ok" : "tag-muted"}`}>{u.role}</span>
            {self && <span className="muted text-sm font-normal">(you)</span>}
          </h1>
          <p className="muted break-all">{u.email}</p>
        </div>
        {!self && <UserActions back={`/admin/users/${u.id}`} user={u} />}
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4">
            <span className="block muted text-[13px]">{t.label}</span>
            <span className="block text-lg sm:text-2xl font-semibold whitespace-nowrap">{t.value}</span>
            <span className="block muted text-xs">{t.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-4 items-start">
        <section className="panel p-4 sm:p-5 flex flex-col gap-3">
          <h2>Profile</h2>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-[13px]">
            <dt className="muted">Joined</dt>
            <dd>{date(u.createdAt)}</dd>
            <dt className="muted">Last order</dt>
            <dd>{u.orders[0] ? date(u.orders[0].createdAt) : "—"}</dd>
            <dt className="muted">Password changed</dt>
            <dd>{u.passwordChangedAt ? date(u.passwordChangedAt) : "Never"}</dd>
            <dt className="muted">Phone</dt>
            <dd>
              {a?.phone ? (
                <span className="flex flex-wrap gap-x-3">
                  <a className="link" href={`tel:${a.phone}`}>
                    {a.phone}
                  </a>
                  <a className="link muted" href={whatsapp(a.phone)} rel="noopener" target="_blank">
                    WhatsApp ↗
                  </a>
                </span>
              ) : (
                "—"
              )}
            </dd>
            <dt className="muted">Saved address</dt>
            <dd>
              {a ? (
                <>
                  {a.line1}
                  {a.line2 && <>, {a.line2}</>}
                  <br />
                  {a.city} {a.postalCode}
                </>
              ) : (
                <span className="muted">None yet. It is saved at their first checkout.</span>
              )}
            </dd>
          </dl>
        </section>

        <section className="panel min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-line)]">
            <h2>Orders</h2>
            {u.orders.length > 0 && (
              <Link className="link" href={`/admin/orders?q=${encodeURIComponent(u.email)}`}>
                Open in Orders
              </Link>
            )}
          </div>
          {u.orders.length === 0 ? (
            <p className="muted p-4">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Products</th>
                    <th className="text-right">Total</th>
                    <th>Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {u.orders.map((o) => (
                    <tr key={o.id}>
                      <td className="whitespace-nowrap">
                        <Link className="link" href={`/admin/orders/${o.id}`}>
                          {o.number}
                        </Link>
                      </td>
                      <td className="muted whitespace-nowrap">{date(o.createdAt)}</td>
                      <td className="text-[13px]">
                        {o.items.map((it) => `${it.name} (EU ${it.size}${it.quantity > 1 ? ` ×${it.quantity}` : ""})`).join(", ")}
                      </td>
                      <td className="text-right whitespace-nowrap tabular-nums">{pkr(o.total)}</td>
                      <td>
                        <PaymentTag status={o.payment.status} />
                        <div className="muted text-xs whitespace-nowrap">{paymentMethodLabel(o.payment.method)}</div>
                      </td>
                      <td>
                        <StatusTag status={o.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 items-start">
        <section className="panel p-4 sm:p-5 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2>Bag right now</h2>
            {bagValue > 0 && <span className="muted text-[13px]">{pkr(bagValue)} at today&rsquo;s prices</span>}
          </div>
          {u.cart.bag.length === 0 ? (
            <p className="muted">Empty.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {u.cart.bag.map((l) => (
                <li key={l.id} className="flex items-center gap-3">
                  <span className="relative w-9 h-11 shrink-0 rounded overflow-hidden bg-surface-container">
                    <Image alt="" className="object-cover" fill sizes="36px" src={l.image} unoptimized />
                  </span>
                  <span className="min-w-0 flex-1">
                    <Link className="link block truncate" href={l.href ?? "/"} target="_blank">
                      {l.name}
                    </Link>
                    <span className="muted text-xs">
                      {l.size} · ×{l.quantity}
                    </span>
                  </span>
                  <span className="tabular-nums whitespace-nowrap text-[13px]">{pkr(l.price * l.quantity)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4 sm:p-5 flex flex-col gap-3">
          <h2>Wishlist</h2>
          {u.cart.wishlist.length === 0 ? (
            <p className="muted">Empty.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {u.cart.wishlist.map((w) => (
                <li key={w.id} className="flex items-center gap-3">
                  <span className="relative w-9 h-11 shrink-0 rounded overflow-hidden bg-surface-container">
                    <Image alt="" className="object-cover" fill sizes="36px" src={w.image} unoptimized />
                  </span>
                  <Link className="link min-w-0 flex-1 truncate" href={w.href ?? "/"} target="_blank">
                    {w.name}
                  </Link>
                  <span className="tabular-nums whitespace-nowrap text-[13px]">{pkr(w.price)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="panel p-4 sm:p-5 flex flex-col gap-3 lg:col-span-2 xl:col-span-1">
          <h2>Reviews and restock requests</h2>
          {u.reviews.length === 0 && u.alerts.length === 0 ? (
            <p className="muted">None yet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--a-line)] text-[13px]">
              {u.reviews.map((r) => (
                <li key={r.id} className="py-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="min-w-0">
                    <span aria-label={`${r.rating} out of 5`} className="tabular-nums font-semibold">
                      {r.rating}★
                    </span>{" "}
                    {r.title} <span className="muted">· {r.productSlug}</span>
                  </span>
                  <span className="flex gap-1">
                    {r.verified && <span className="tag tag-ok">verified</span>}
                    <span className={`tag ${r.status === "published" ? "tag-ok" : r.status === "pending" ? "tag-warn" : "tag-muted"}`}>
                      {r.status}
                    </span>
                  </span>
                </li>
              ))}
              {u.alerts.map((al) => (
                <li key={`${al.slug}-${al.size}`} className="py-2 flex justify-between gap-2">
                  <span>
                    Notify me: {al.slug} · EU {al.size} <span className="muted">· {date(al.createdAt)}</span>
                  </span>
                  <span className={`tag ${al.notified ? "tag-ok" : "tag-warn"}`}>{al.notified ? "notified" : "waiting"}</span>
                </li>
              ))}
            </ul>
          )}
          {u.reviews.length > 0 && (
            <Link className="link text-[13px]" href="/admin/reviews">
              Manage reviews
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
