import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { categoryLabel, LOW_STOCK, productHref, salePrice } from "@/lib/products";
import { getProductById } from "@/lib/server/products";
import { getListingDetail } from "@/lib/server/insights";
import { StatusTag } from "@/components/admin/OrderTags";
import { date, pkr } from "@/components/admin/format";
import ListingTabs from "@/components/admin/ListingTabs";
import ChartCard from "@/components/admin/charts/ChartCard";
import ColumnChart from "@/components/admin/charts/ColumnChart";
import BarList from "@/components/admin/charts/BarList";
import { shortDay } from "@/components/admin/charts/scale";

export const metadata = { title: "Listing insights" };

const n = (x: number) => x.toLocaleString("en-US");

async function ListingInsightsContent({ params }: PageProps<"/admin/products/[id]/insights">) {
  await requireAdmin();
  const { id } = await params;
  const p = await getProductById(id);
  if (!p) notFound();
  const d = await getListingDetail(p.slug);
  const s = d.stats;
  const soldBySize = new Map(d.bySize.map((x) => [x.size, x.pairs]));
  const last30 = d.daily.reduce((t, x) => t + x.pairs, 0);

  const tiles = [
    { label: "Sold", value: n(s.sold + p.otherSales), hint: `${n(s.sold)} online${p.otherSales ? ` + ${n(p.otherSales)} off-site` : ""}` },
    { label: "Last 30 days", value: `${n(last30)} ${last30 === 1 ? "pair" : "pairs"}`, hint: "Online, cancelled excluded" },
    { label: "Online revenue", value: pkr(s.revenue), hint: `${n(s.orders)} ${s.orders === 1 ? "order" : "orders"}` },
    {
      label: "Rating",
      value: s.rating ? `${s.rating.average.toFixed(1)} ★` : "—",
      hint: s.rating ? `${n(s.rating.count)} published${s.pendingReviews ? `, ${s.pendingReviews} to review` : ""}` : s.pendingReviews ? `${s.pendingReviews} to review` : "No reviews yet",
    },
    { label: "In wishlists", value: n(s.wishlisted), hint: s.wishlisted === 0 ? "Nobody has saved it yet" : `${n(s.inBags)} ${s.inBags === 1 ? "pair" : "pairs"} in bags now` },
    { label: "Waiting for restock", value: n(s.waiting), hint: s.waiting ? "Restocking emails them" : "No requests" },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <span className="relative w-14 h-[70px] shrink-0 rounded-lg overflow-hidden bg-surface-container">
            <Image alt="" className="object-cover" fill sizes="56px" src={p.image} unoptimized />
          </span>
          <div className="min-w-0">
            <Link className="link muted" href="/admin/products">
              ← Listings
            </Link>
            <h1 className="mt-1 flex flex-wrap items-center gap-2">
              {p.name}
              <span className={`tag ${p.status === "published" ? "tag-ok" : "tag-muted"}`}>{p.status}</span>
            </h1>
            <p className="muted">
              {categoryLabel(p.category)} · {p.discountPercent > 0 ? `${pkr(salePrice(p))} (−${p.discountPercent}% from ${pkr(p.price)})` : pkr(p.price)} · updated {date(p.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {p.status === "published" && (
            <Link className="btn" href={productHref(p)} target="_blank">
              View on store ↗
            </Link>
          )}
          <Link className="btn btn-primary" href={`/admin/products/${p.id}`}>
            Edit listing
          </Link>
        </div>
      </div>

      <ListingTabs current="insights" id={p.id} />

      <div className="grid grid-cols-2 md:grid-cols-3 2xl:grid-cols-6 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="panel p-4">
            <span className="block muted text-[13px]">{t.label}</span>
            <span className="block text-lg sm:text-2xl font-semibold whitespace-nowrap">{t.value}</span>
            <span className="block muted text-xs">{t.hint}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-4 items-start">
        <ChartCard
          subtitle="Online pairs sold each day over the last 30 days (cancelled orders excluded)."
          table={{ head: ["Day", "Pairs"], rows: [...d.daily].reverse().map((x) => [shortDay(x.day), n(x.pairs)]) }}
          title="Pairs sold per day"
        >
          <ColumnChart label="Pairs sold" points={d.daily.map((x) => ({ day: x.day, value: x.pairs }))} unit="count" />
        </ChartCard>

        <ChartCard subtitle="All-time online pairs per size. Helps decide what to restock." title="Sold by size">
          <BarList
            empty="No pairs sold online yet."
            format={(v) => `${n(v)} ${v === 1 ? "pair" : "pairs"}`}
            rows={p.sizes.map((size) => ({ key: String(size), label: `EU ${size}`, value: soldBySize.get(size) ?? 0 }))}
          />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] gap-4 items-start">
        <section className="panel min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-line)]">
            <h2>Stock by size</h2>
            <Link className="link" href={`/admin/products/${p.id}`}>
              Change stock
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>Size</th>
                  <th className="text-right">Left</th>
                  <th className="text-right">Sold</th>
                  <th className="text-right">Waiting</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {p.sizes.map((size) => {
                  const left = p.stock[String(size)];
                  const waiting = d.waitingBySize[String(size)] ?? 0;
                  return (
                    <tr key={size}>
                      <td>EU {size}</td>
                      <td className="text-right tabular-nums">{left === undefined ? <span className="muted">—</span> : n(left)}</td>
                      <td className="text-right tabular-nums">{n(soldBySize.get(size) ?? 0)}</td>
                      <td className="text-right tabular-nums">{waiting ? n(waiting) : <span className="muted">0</span>}</td>
                      <td>
                        {left === undefined ? (
                          <span className="tag tag-muted">not tracked</span>
                        ) : left === 0 ? (
                          <span className="tag tag-bad">sold out</span>
                        ) : left <= LOW_STOCK ? (
                          <span className="tag tag-warn">low</span>
                        ) : (
                          <span className="tag tag-ok">in stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel min-w-0">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--a-line)]">
            <h2>Recent orders with this product</h2>
          </div>
          {d.recentOrders.length === 0 ? (
            <p className="muted p-4">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table>
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Size</th>
                    <th className="text-right">Pairs</th>
                    <th className="text-right">Paid price</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentOrders.map((o) => (
                    <tr key={`${o.id}-${o.size}`}>
                      <td className="whitespace-nowrap">
                        <Link className="link" href={`/admin/orders/${o.id}`}>
                          {o.number}
                        </Link>
                      </td>
                      <td className="muted whitespace-nowrap">{date(o.createdAt)}</td>
                      <td>{o.customer}</td>
                      <td className="whitespace-nowrap">EU {o.size}</td>
                      <td className="text-right tabular-nums">{o.quantity}</td>
                      <td className="text-right tabular-nums whitespace-nowrap">{pkr(o.unitPrice)}</td>
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
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function ListingInsights(props: PageProps<"/admin/products/[id]/insights">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <ListingInsightsContent {...props} />
    </Suspense>
  );
}
