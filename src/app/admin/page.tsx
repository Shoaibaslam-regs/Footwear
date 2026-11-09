import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { listAllProducts } from "@/lib/server/products";
import { listUsers } from "@/lib/server/users";
import { listOrders, orderStats } from "@/lib/server/orders";
import { PaymentTag, StatusTag } from "@/components/admin/OrderTags";
import { getSiteSettings } from "@/lib/server/settings";
import { date, pkr } from "@/components/admin/format";

export const metadata = { title: "Overview" };

export default async function AdminOverview() {
  const me = await requireAdmin();
  const [products, users, stats0, recentOrders, settings] = await Promise.all([
    listAllProducts(),
    listUsers(),
    orderStats(),
    listOrders(),
    getSiteSettings(),
  ]);
  const published = products.filter((p) => p.status === "published").length;
  const onSale = products.filter((p) => p.discountPercent > 0).length;
  const c = stats0.counts;
  const inProgress = (c.confirmed ?? 0) + (c.processing ?? 0) + (c.shipped ?? 0) + (c.out_for_delivery ?? 0);
  const business = [
    { label: "New orders to confirm", value: String(c.pending ?? 0), href: "/admin/orders?status=pending" },
    { label: "In fulfilment", value: String(inProgress), href: "/admin/orders" },
    { label: "Delivered", value: String(c.delivered ?? 0), href: "/admin/orders?status=delivered" },
    { label: "Revenue received", value: pkr(stats0.paidRevenue), href: "/admin/orders?payment=paid" },
    { label: "Awaiting payment", value: pkr(stats0.outstanding), href: "/admin/orders?payment=pending" },
  ];
  const stats = [
    { label: "Listings", value: products.length, href: "/admin/products" },
    { label: "Published", value: published, href: "/admin/products?status=published" },
    { label: "On sale", value: onSale, href: "/admin/products" },
    { label: "Users", value: users.length, href: "/admin/users" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1>Overview</h1>
          <p className="muted">Signed in as {me.name}.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/products/new">
          New listing
        </Link>
      </div>

      {!settings.deliveryConfigured && (
        <p className="notice notice-bad">
          Delivery options are not set up. Customers see a placeholder &ldquo;Standard Delivery&rdquo; at PKR 0.{" "}
          <Link className="link" href="/admin/settings">
            Add your couriers and fees
          </Link>
          .
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {business.map((s) => (
          <Link key={s.label} className="panel p-4 hover:border-[#bbb]" href={s.href}>
            <div className="muted">{s.label}</div>
            <div className="text-xl font-semibold whitespace-nowrap">{s.value}</div>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--a-line)]">
          <h2>Latest orders</h2>
          <Link className="link" href="/admin/orders">
            All orders
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Total</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.slice(0, 5).map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link className="link" href={`/admin/orders/${o.id}`}>
                      {o.number}
                    </Link>
                  </td>
                  <td>{o.customer.name}</td>
                  <td>{pkr(o.total)}</td>
                  <td>
                    <PaymentTag status={o.payment.status} />
                  </td>
                  <td>
                    <StatusTag status={o.status} />
                  </td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td className="muted" colSpan={5}>
                    No orders yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <Link key={s.label} className="panel p-4 hover:border-[#bbb]" href={s.href}>
            <div className="muted">{s.label}</div>
            <div className="text-2xl font-semibold">{s.value}</div>
          </Link>
        ))}
      </div>

      <section className="panel">
        <div className="flex items-center justify-between px-3 py-3 border-b border-[var(--a-line)]">
          <h2>Recently updated</h2>
          <Link className="link" href="/admin/products">
            All listings
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {products.slice(0, 5).map((p) => (
                <tr key={p.id}>
                  <td>
                    <Link className="link" href={`/admin/products/${p.id}`}>
                      {p.name}
                    </Link>
                  </td>
                  <td>{pkr(p.price)}</td>
                  <td>
                    <span className={`tag ${p.status === "published" ? "tag-ok" : "tag-muted"}`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="muted">{date(p.updatedAt)}</td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr>
                  <td className="muted" colSpan={4}>
                    No listings yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
