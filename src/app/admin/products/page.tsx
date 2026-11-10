import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  categoryLabel,
  productCategories,
  productHref,
  productStatuses,
  LOW_STOCK,
  salePrice,
  type Listing,
  type ProductCategory,
  type ProductStatus,
} from "@/lib/products";
import { listAllProducts } from "@/lib/server/products";
import { listingStatsBySlug, statsFor } from "@/lib/server/insights";
import Pager, { pageOf } from "@/components/admin/Pager";
import { deleteProducts, setProductStatus } from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SelectAll from "@/components/admin/SelectAll";
import { date, pkr } from "@/components/admin/format";

export const metadata = { title: "Listings" };

const one = (v: string | string[] | undefined) =>
  typeof v === "string" ? v : undefined;

/** Pairs left over the tracked sizes; null when no size is tracked (unlimited). */
function stockOf(p: Listing) {
  const tracked = p.sizes.filter((s) => p.stock[String(s)] !== undefined);
  if (tracked.length === 0) return null;
  const left = tracked.map((s) => p.stock[String(s)]);
  return {
    total: left.reduce((n, x) => n + x, 0),
    out: left.filter((x) => x === 0).length,
    low: left.filter((x) => x > 0 && x <= LOW_STOCK).length,
    untracked: p.sizes.length - tracked.length,
  };
}

const STOCK = [
  { value: "", label: "Any stock" },
  { value: "low", label: `Running low (≤${LOW_STOCK})` },
  { value: "out", label: "Has a sold-out size" },
  { value: "untracked", label: "Not tracked" },
] as const;
const OFFER = [
  { value: "", label: "Any price" },
  { value: "sale", label: "On sale" },
  { value: "full", label: "Full price" },
] as const;
const SORTS = [
  { value: "", label: "Recently updated" },
  { value: "newest", label: "Newest first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "price", label: "Price, low to high" },
  { value: "price-desc", label: "Price, high to low" },
  { value: "sold", label: "Best-selling" },
  { value: "revenue", label: "Most revenue" },
  { value: "wishlist", label: "Most wishlisted" },
  { value: "rating", label: "Top rated" },
  { value: "stock", label: "Lowest stock" },
] as const;

async function AdminProductsContent({
  searchParams,
}: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const status = productStatuses.find((s) => s === one(sp.status)) as
    ProductStatus | undefined;
  const category = productCategories.find((c) => c.value === one(sp.category))
    ?.value as ProductCategory | undefined;
  const [all, catalogue, statsAll] = await Promise.all([
    listAllProducts({ q, status, category }),
    listAllProducts(),
    listingStatsBySlug(),
  ]);
  const stockFilter = STOCK.find((x) => x.value === one(sp.stock))?.value ?? "";
  const offer = OFFER.find((x) => x.value === one(sp.offer))?.value ?? "";
  const sort = SORTS.find((x) => x.value === one(sp.sort))?.value ?? "";
  const st = (p: Listing) => statsFor(statsAll, p.slug);
  const sold = (p: Listing) => st(p).sold + (p.otherSales || 0);
  const filteredList = all.filter((p) => {
    const k = stockOf(p);
    if (stockFilter === "low" && !(k && k.low > 0)) return false;
    if (stockFilter === "out" && !(k && k.out > 0)) return false;
    if (stockFilter === "untracked" && k) return false;
    if (offer === "sale" && !(p.discountPercent > 0)) return false;
    if (offer === "full" && p.discountPercent > 0) return false;
    return true;
  });
  const by: Record<string, (a: Listing, b: Listing) => number> = {
    newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    name: (a, b) => a.name.localeCompare(b.name),
    price: (a, b) => salePrice(a) - salePrice(b),
    "price-desc": (a, b) => salePrice(b) - salePrice(a),
    sold: (a, b) => sold(b) - sold(a),
    revenue: (a, b) => st(b).revenue - st(a).revenue,
    wishlist: (a, b) => st(b).wishlisted - st(a).wishlisted,
    rating: (a, b) => (st(b).rating?.average ?? 0) - (st(a).rating?.average ?? 0) || (st(b).rating?.count ?? 0) - (st(a).rating?.count ?? 0),
    stock: (a, b) => (stockOf(a)?.total ?? Infinity) - (stockOf(b)?.total ?? Infinity),
  };
  const sorted = by[sort] ? [...filteredList].sort(by[sort]) : filteredList;
  const { from, to } = pageOf(sp, sorted.length);
  const products = sorted.slice(from, to);

  // Catalogue-wide figures (ignoring the filters), each a shortcut to its filter.
  const summary = [
    { label: "Published", value: catalogue.filter((p) => p.status === "published").length, href: "/admin/products?status=published" },
    { label: "Drafts", value: catalogue.filter((p) => p.status === "draft").length, href: "/admin/products?status=draft" },
    { label: "On sale", value: catalogue.filter((p) => p.discountPercent > 0).length, href: "/admin/products?offer=sale" },
    { label: "Running low", value: catalogue.filter((p) => (stockOf(p)?.low ?? 0) > 0).length, href: "/admin/products?stock=low&sort=stock" },
    { label: "Sold-out sizes", value: catalogue.reduce((n, p) => n + (stockOf(p)?.out ?? 0), 0), href: "/admin/products?stock=out" },
    { label: "Waiting for restock", value: catalogue.reduce((n, p) => n + st(p).waiting, 0), href: "/admin/products?stock=out" },
  ];
  const saved = one(sp.saved);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1>Listings</h1>
          <p className="muted">
            Every product on the website comes from this list.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/products/new">
          New listing
        </Link>
      </div>

      {saved && (
        <p className="panel px-3 py-2" role="status">
          Saved “{saved}”. The website is updated.
        </p>
      )}
      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          {one(sp.deleted) === "1"
            ? "Listing deleted."
            : `${one(sp.deleted)} listings deleted.`}{" "}
          They are no longer on the website.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {summary.map((x) => (
          <Link key={x.label} className="panel p-4 hover:border-[var(--color-outline)]" href={x.href}>
            <span className="block muted text-[13px]">{x.label}</span>
            <span className="block text-xl font-semibold">{x.value.toLocaleString("en-US")}</span>
          </Link>
        ))}
      </div>

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-[minmax(0,1fr)_130px_150px_190px_130px_180px_auto] gap-2 items-end">
        <label className="field">
          Search
          <input
            className="input"
            defaultValue={q}
            name="q"
            placeholder="Name, slug or material"
            type="search"
          />
        </label>
        <label className="field">
          Status
          <select defaultValue={status ?? ""} name="status">
            <option value="">All</option>
            {productStatuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Category
          <select defaultValue={category ?? ""} name="category">
            <option value="">All</option>
            {productCategories.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Stock
          <select defaultValue={stockFilter} name="stock">
            {STOCK.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Price
          <select defaultValue={offer} name="offer">
            {OFFER.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Sort by
          <select defaultValue={sort} name="sort">
            {SORTS.map((x) => (
              <option key={x.value} value={x.value}>
                {x.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Apply
          </button>
          <Link className="btn" href="/admin/products">
            Reset
          </Link>
        </div>
      </form>

      <form
        action={deleteProducts}
        className="flex items-center justify-between gap-2"
        id="bulk-products"
      >
        <span className="muted">
          Tick rows to delete several listings at once.
        </span>
        <ConfirmButton
          confirmLabel="Delete listings"
          message="They will be removed from the website. This cannot be undone."
          selectionForm="bulk-products"
          title="Delete {n} selected listing(s)?"
        >
          Delete selected
        </ConfirmButton>
      </form>

      {products.length === 0 ? (
        <div className="empty">
          No listings match these filters
          <span className="muted">Create a listing with “New listing”.</span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th className="w-8">
                  <SelectAll form="bulk-products" label="Select all listings" />
                </th>
                <th className="w-14" />
                <th className="min-w-[13rem]">Name</th>
                <th>Price</th>
                <th>Status</th>
                <th>Stock</th>
                <th className="text-right" title="Online orders (not cancelled) plus off-site sales">Sold</th>
                <th>Rating</th>
                <th className="hidden 2xl:table-cell" title="Wishlists · pairs in bags">Saved · In bags</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id}>
                  <td>
                    <input
                      aria-label={`Select ${p.name}`}
                      form="bulk-products"
                      name="ids"
                      type="checkbox"
                      value={p.id}
                    />
                  </td>
                  <td>
                    <div className="relative w-10 h-12 rounded overflow-hidden bg-surface-container">
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="40px"
                        src={p.image}
                        unoptimized
                      />
                    </div>
                  </td>
                  <td>
                    <Link
                      className="font-medium link"
                      href={`/admin/products/${p.id}`}
                    >
                      {p.name}
                    </Link>
                    <div className="muted text-xs">
                      {categoryLabel(p.category)} ·{" "}
                      {p.status === "published" ? (
                        <Link className="hover:underline" href={productHref(p)} target="_blank" title="Open on the store">
                          /{p.slug} ↗
                        </Link>
                      ) : (
                        <>/{p.slug}</>
                      )}
                    </div>
                    {st(p).waiting ? (
                      <span
                        className="tag tag-warn mt-1"
                        title="Customers asked to be told when a sold-out size is back"
                      >
                        {st(p).waiting} waiting for restock
                      </span>
                    ) : null}
                  </td>
                  <td className="whitespace-nowrap">
                    {p.discountPercent > 0 ? (
                      <>
                        {pkr(salePrice(p))}{" "}
                        <span className="tag tag-muted">
                          −{p.discountPercent}%
                        </span>
                        <div className="muted text-xs line-through">
                          {pkr(p.price)}
                        </div>
                      </>
                    ) : (
                      pkr(p.price)
                    )}
                  </td>
                  <td>
                    <span
                      className={`tag ${p.status === "published" ? "tag-ok" : "tag-muted"}`}
                    >
                      {p.status}
                    </span>
                    <div className="muted text-xs whitespace-nowrap mt-0.5">Updated {date(p.updatedAt)}</div>
                  </td>
                  <td className="whitespace-nowrap text-[13px]">
                    {(() => {
                      const k = stockOf(p);
                      if (!k) return <span className="muted">Not tracked</span>;
                      return (
                        <>
                          <span className="tabular-nums">{k.total} pairs</span>
                          <div className="flex gap-1 mt-0.5">
                            {k.out > 0 && <span className="tag tag-bad">{k.out} sold out</span>}
                            {k.low > 0 && <span className="tag tag-warn">{k.low} low</span>}
                          </div>
                          {k.untracked > 0 && (
                            <div className="muted text-xs" title="Sizes without a stock count are unlimited">
                              +{k.untracked} {k.untracked === 1 ? "size" : "sizes"} not tracked
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </td>
                  <td className="text-right tabular-nums whitespace-nowrap">
                    {sold(p)}
                    {st(p).revenue > 0 && <div className="muted text-xs">{pkr(st(p).revenue)}</div>}
                  </td>
                  <td className="whitespace-nowrap text-[13px]">
                    {st(p).rating ? (
                      <>
                        <span className="font-semibold tabular-nums">{st(p).rating!.average.toFixed(1)}★</span>{" "}
                        <span className="muted">({st(p).rating!.count})</span>
                      </>
                    ) : (
                      <span className="muted">—</span>
                    )}
                    {st(p).pendingReviews > 0 && (
                      <Link className="block tag tag-warn mt-0.5 w-fit" href="/admin/reviews?status=pending">
                        {st(p).pendingReviews} to review
                      </Link>
                    )}
                  </td>
                  <td className="hidden 2xl:table-cell tabular-nums whitespace-nowrap">
                    {st(p).wishlisted} · {st(p).inBags}
                  </td>
                  <td>
                    <div className="flex justify-end gap-1.5 whitespace-nowrap">
                      <form action={setProductStatus}>
                        <input name="id" type="hidden" value={p.id} />
                        <input
                          name="status"
                          type="hidden"
                          value={
                            p.status === "published" ? "draft" : "published"
                          }
                        />
                        <button className="btn btn-sm" type="submit">
                          {p.status === "published" ? "Unpublish" : "Publish"}
                        </button>
                      </form>
                      <Link className="btn btn-sm" href={`/admin/products/${p.id}/insights`}>
                        Insights
                      </Link>
                      <Link className="btn btn-sm" href={`/admin/products/${p.id}`}>
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pager noun={["listing", "listings"]} path="/admin/products" sp={sp} total={sorted.length} />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function AdminProducts(props: PageProps<"/admin/products">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminProductsContent {...props} />
    </Suspense>
  );
}
