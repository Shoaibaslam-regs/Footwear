import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getDashboard, RANGES, type RangeDays } from "@/lib/server/dashboard";
import { listAllProducts } from "@/lib/server/products";
import { listUsers } from "@/lib/server/users";
import { listOrders } from "@/lib/server/orders";
import { getSiteSettings } from "@/lib/server/settings";
import { fulfilmentSteps, orderStatusLabel, type OrderStatus } from "@/lib/orders";
import { PaymentTag, StatusTag } from "@/components/admin/OrderTags";
import { date, pkr } from "@/components/admin/format";
import StatTile from "@/components/admin/charts/StatTile";
import ChartCard from "@/components/admin/charts/ChartCard";
import BarList from "@/components/admin/charts/BarList";
import TrendChart from "@/components/admin/charts/TrendChart";
import ColumnChart from "@/components/admin/charts/ColumnChart";
import { shortDay } from "@/components/admin/charts/scale";

export const metadata = { title: "Overview" };

const count = (n: number) => n.toLocaleString("en-US");

async function AdminOverviewContent({ searchParams }: PageProps<"/admin">) {
  const me = await requireAdmin();
  const sp = await searchParams;
  const asked = Number(sp.range);
  const range: RangeDays = (RANGES as readonly number[]).includes(asked) ? (asked as RangeDays) : 30;

  const [d, products, users, recentOrders, settings] = await Promise.all([
    getDashboard(range),
    listAllProducts(),
    listUsers(),
    listOrders(),
    getSiteSettings(),
  ]);
  const period = `${range} days`;
  const k = d.kpis;
  const a = d.attention;
  const statusCount = new Map(d.byStatus.map((s) => [s.status, s.count]));
  const stages: OrderStatus[] = [...fulfilmentSteps, "cancelled"];
  const published = products.filter((p) => p.status === "published").length;
  const onSale = products.filter((p) => p.discountPercent > 0).length;

  const todo = [
    a.toConfirm > 0 && {
      href: "/admin/orders?status=pending",
      title: `${count(a.toConfirm)} new ${a.toConfirm === 1 ? "order" : "orders"} to confirm`,
      hint: "Call or message the customer, then confirm.",
    },
    a.awaitingPayment.count > 0 && {
      href: "/admin/orders?payment=pending",
      title: `${pkr(a.awaitingPayment.amount)} awaiting payment`,
      hint: `${count(a.awaitingPayment.count)} open ${a.awaitingPayment.count === 1 ? "order" : "orders"} not yet marked paid.`,
    },
    a.restockRequests > 0 && {
      href: "/admin/products",
      title: `${count(a.restockRequests)} “notify me” ${a.restockRequests === 1 ? "request" : "requests"}`,
      hint: "Customers are waiting for a sold-out size. Restocking emails them.",
    },
    !settings.deliveryConfigured && {
      href: "/admin/settings",
      title: "Delivery options are not set up",
      hint: "Customers see a placeholder “Standard Delivery” at PKR 0.",
    },
  ].filter(Boolean) as { href: string; title: string; hint: string }[];

  return (
    <div className="flex flex-col gap-6">
      {/* Title + the one filter row for everything below */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Overview</h1>
          <p className="muted">
            Welcome back, {me.name.split(" ")[0]}. Figures cover the last {period}, compared with the {period} before.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Date range" className="flex gap-1 rounded-full bg-[var(--a-panel)] border border-[var(--a-line)] p-1">
            {RANGES.map((r) => (
              <Link
                key={r}
                aria-current={r === range ? "page" : undefined}
                className="pill"
                href={r === 30 ? "/admin" : `/admin?range=${r}`}
                scroll={false}
              >
                {r} days
              </Link>
            ))}
          </nav>
          <Link className="btn btn-primary" href="/admin/products/new">
            New listing
          </Link>
        </div>
      </div>

      {/* Headline numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatTile before={k.revenue.before} label="Sales" now={k.revenue.now} period={period} value={pkr(k.revenue.now)} />
        <StatTile before={k.orders.before} href="/admin/orders" label="Orders" now={k.orders.now} period={period} value={count(k.orders.now)} />
        <StatTile before={k.avgOrder.before} label="Average order" now={k.avgOrder.now} period={period} value={pkr(k.avgOrder.now)} />
        <StatTile before={k.paid.before} href="/admin/orders?payment=paid" label="Payment received" now={k.paid.now} period={period} value={pkr(k.paid.now)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <ChartCard
          className="xl:col-span-2"
          subtitle="Order value per day, excluding cancelled orders."
          table={{ head: ["Day", "Sales"], rows: [...d.daily].reverse().map((p) => [shortDay(p.day), pkr(p.revenue)]) }}
          title="Sales per day"
        >
          <TrendChart label="Sales" points={d.daily.map((p) => ({ day: p.day, value: p.revenue }))} unit="pkr" />
        </ChartCard>

        {/* Needs attention */}
        <section className="panel p-4 sm:p-5 flex flex-col gap-3">
          <h2>Needs attention</h2>
          {todo.length === 0 && a.lowStock.length === 0 ? (
            <p className="muted py-6 text-center">All caught up. Nothing is waiting on you.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-[var(--a-line)]">
              {todo.map((t) => (
                <li key={t.href + t.title}>
                  <Link className="flex items-start justify-between gap-3 py-2.5 group" href={t.href}>
                    <span>
                      <span className="block font-semibold group-hover:underline underline-offset-3">{t.title}</span>
                      <span className="muted text-[13px]">{t.hint}</span>
                    </span>
                    <span aria-hidden="true" className="muted">→</span>
                  </Link>
                </li>
              ))}
              {a.lowStock.length > 0 && (
                <li className="py-2.5">
                  <span className="block font-semibold">Running low</span>
                  <ul className="mt-1 flex flex-col gap-1">
                    {a.lowStock.map((s) => (
                      <li key={`${s.id}-${s.size}`} className="flex justify-between gap-3 text-[13px]">
                        <Link className="link truncate" href={`/admin/products/${s.id}`}>
                          {s.name} · EU {s.size}
                        </Link>
                        <span className={`tag ${s.left === 0 ? "tag-bad" : "tag-warn"}`}>
                          {s.left === 0 ? "Sold out" : `${s.left} left`}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <ChartCard
          subtitle="New orders placed each day."
          table={{ head: ["Day", "Orders"], rows: [...d.daily].reverse().map((p) => [shortDay(p.day), count(p.orders)]) }}
          title="Orders per day"
        >
          <ColumnChart label="Orders" points={d.daily.map((p) => ({ day: p.day, value: p.orders }))} unit="count" />
        </ChartCard>

        <ChartCard subtitle={`Where this period's orders are now, from new to delivered.`} title="Orders by stage">
          <BarList
            empty="No orders in this period."
            format={count}
            rows={stages.map((s) => ({
              key: s,
              label: (
                <Link className="hover:underline" href={`/admin/orders?status=${s}`}>
                  {orderStatusLabel[s]}
                </Link>
              ),
              value: statusCount.get(s) ?? 0,
            }))}
          />
        </ChartCard>

        <ChartCard
          className="lg:col-span-2 xl:col-span-1"
          subtitle="Pairs sold in this period (cancelled orders excluded)."
          table={{ head: ["Product", "Sales"], rows: d.topProducts.map((t) => [`${t.name} (${t.pairs})`, pkr(t.revenue)]) }}
          title="Best-selling products"
        >
          <BarList
            empty="No products sold in this period."
            format={(n) => `${count(n)} ${n === 1 ? "pair" : "pairs"}`}
            rows={d.topProducts.map((t) => ({ key: t.slug, label: t.name, value: t.pairs, hint: `${t.name} · ${pkr(t.revenue)}` }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
        <section className="panel min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-line)]">
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
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.slice(0, 6).map((o) => (
                  <tr key={o.id}>
                    <td className="whitespace-nowrap">
                      <Link className="link" href={`/admin/orders/${o.id}`}>
                        {o.number}
                      </Link>
                    </td>
                    <td className="muted whitespace-nowrap">{date(o.createdAt)}</td>
                    <td>{o.customer.name}</td>
                    <td className="whitespace-nowrap tabular-nums">{pkr(o.total)}</td>
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
                    <td className="muted" colSpan={6}>
                      No orders yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel p-4 sm:p-5 flex flex-col gap-3">
          <h2>Store at a glance</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Listings", value: products.length, href: "/admin/products" },
              { label: "Published", value: published, href: "/admin/products?status=published" },
              { label: "On sale", value: onSale, href: "/admin/products" },
              { label: "Accounts", value: users.length, href: "/admin/users" },
            ].map((s) => (
              <Link key={s.label} className="rounded-lg border border-[var(--a-line)] p-3 hover:border-[var(--color-outline)]" href={s.href}>
                <span className="block muted text-[13px]">{s.label}</span>
                <span className="block text-xl font-semibold">{count(s.value)}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Its own loading placeholder: the content checks coupon dates (the current time),
 * so it must stream inside the page rather than block navigation to it.
 */
export default function AdminOverview(props: PageProps<"/admin">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminOverviewContent {...props} />
    </Suspense>
  );
}
