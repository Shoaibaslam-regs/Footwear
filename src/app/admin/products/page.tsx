import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import {
  categoryLabel,
  productCategories,
  productHref,
  productStatuses,
  salePrice,
  type ProductCategory,
  type ProductStatus,
} from "@/lib/products";
import { listAllProducts } from "@/lib/server/products";
import { waitingBySlug } from "@/lib/server/stock-alerts";
import { deleteProducts, setProductStatus } from "../actions";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SelectAll from "@/components/admin/SelectAll";
import { date, pkr } from "@/components/admin/format";

export const metadata = { title: "Listings" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

export default async function AdminProducts({ searchParams }: PageProps<"/admin/products">) {
  await requireAdmin();
  const sp = await searchParams;
  const q = one(sp.q)?.trim() || undefined;
  const status = productStatuses.find((s) => s === one(sp.status)) as ProductStatus | undefined;
  const category = productCategories.find((c) => c.value === one(sp.category))?.value as
    | ProductCategory
    | undefined;
  const [products, waiting] = await Promise.all([listAllProducts({ q, status, category }), waitingBySlug()]);
  const saved = one(sp.saved);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1>Listings</h1>
          <p className="muted">Every product shown on the storefront comes from this list.</p>
        </div>
        <Link className="btn btn-primary" href="/admin/products/new">
          New listing
        </Link>
      </div>

      {saved && (
        <p className="panel px-3 py-2" role="status">
          Saved “{saved}”. The storefront is updated.
        </p>
      )}
      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          {one(sp.deleted) === "1" ? "Listing deleted." : `${one(sp.deleted)} listings deleted.`} They are no longer on the storefront.
        </p>
      )}

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-[1fr_160px_180px_auto] gap-2 items-end">
        <label className="field">
          Search
          <input className="input" defaultValue={q} name="q" placeholder="Name, slug or material" type="search" />
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
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Filter
          </button>
          <Link className="btn" href="/admin/products">
            Reset
          </Link>
        </div>
      </form>

      <form action={deleteProducts} className="flex items-center justify-between gap-2" id="bulk-products">
        <span className="muted">Tick rows to delete several listings at once.</span>
        <ConfirmButton
          confirmLabel="Delete listings"
          message="They will be removed from the storefront. This cannot be undone."
          selectionForm="bulk-products"
          title="Delete {n} selected listing(s)?"
        >
          Delete selected
        </ConfirmButton>
      </form>

      <div className="panel overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-8">
                <SelectAll form="bulk-products" label="Select all listings" />
              </th>
              <th className="w-14" />
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Status</th>
              <th>Home</th>
              <th>Updated</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>
                  <input aria-label={`Select ${p.name}`} form="bulk-products" name="ids" type="checkbox" value={p.id} />
                </td>
                <td>
                  <div className="relative w-10 h-12 rounded overflow-hidden bg-[#eee]">
                    <Image alt="" className="object-cover" fill sizes="40px" src={p.image} unoptimized />
                  </div>
                </td>
                <td>
                  <Link className="font-medium link" href={`/admin/products/${p.id}`}>
                    {p.name}
                  </Link>
                  <div className="muted text-xs">/{p.slug}</div>
                  {waiting[p.slug] ? (
                    <span className="tag tag-warn mt-1" title="Clients asked to be notified when a sold-out size is back">
                      {waiting[p.slug]} waiting for restock
                    </span>
                  ) : null}
                </td>
                <td>{categoryLabel(p.category)}</td>
                <td className="whitespace-nowrap">
                  {p.discountPercent > 0 ? (
                    <>
                      {pkr(salePrice(p))} <span className="tag tag-muted">−{p.discountPercent}%</span>
                      <div className="muted text-xs line-through">{pkr(p.price)}</div>
                    </>
                  ) : (
                    pkr(p.price)
                  )}
                </td>
                <td>
                  <span className={`tag ${p.status === "published" ? "tag-ok" : "tag-muted"}`}>{p.status}</span>
                </td>
                <td className="muted text-xs whitespace-nowrap">
                  {[p.newArrival && "New arrival", p.bestSeller && "Best seller"].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="muted whitespace-nowrap">{date(p.updatedAt)}</td>
                <td>
                  <div className="flex justify-end gap-2">
                    <form action={setProductStatus}>
                      <input name="id" type="hidden" value={p.id} />
                      <input name="status" type="hidden" value={p.status === "published" ? "draft" : "published"} />
                      <button className="btn" type="submit">
                        {p.status === "published" ? "Unpublish" : "Publish"}
                      </button>
                    </form>
                    <Link className="btn" href={`/admin/products/${p.id}`}>
                      Edit
                    </Link>
                    {p.status === "published" && (
                      <Link className="btn" href={productHref(p)} target="_blank">
                        View
                      </Link>
                    )}
                    <form action={deleteProducts}>
                      <input name="ids" type="hidden" value={p.id} />
                      <ConfirmButton message="It will be removed from the storefront. This cannot be undone." title={`Delete “${p.name}”?`}>
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td className="muted" colSpan={9}>
                  No listings match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{products.length} listing(s)</p>
    </div>
  );
}
