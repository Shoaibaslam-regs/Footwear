import Image from "next/image";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { fitOptions, reviewStatuses, type ReviewStatus } from "@/lib/reviews";
import { listReviews } from "@/lib/server/reviews";
import ConfirmButton from "@/components/admin/ConfirmButton";
import SelectAll from "@/components/admin/SelectAll";
import { date } from "@/components/admin/format";
import { deleteReviews, setReviewsStatus } from "../actions";

export const metadata = { title: "Reviews" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

export default async function AdminReviews({ searchParams }: PageProps<"/admin/reviews">) {
  await requireAdmin();
  const sp = await searchParams;
  const status = reviewStatuses.find((s) => s === one(sp.status)) as ReviewStatus | undefined;
  const rating = Number(one(sp.rating)) || undefined;
  const q = one(sp.q)?.trim() || undefined;
  const reviews = await listReviews({ status, rating, q });

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Reviews</h1>
        <p className="muted">
          Written by signed-in clients. Reviews go live immediately. Hide anything inappropriate, or delete spam. Admins
          cannot write or edit reviews.
        </p>
      </div>

      <form className="panel p-3 grid grid-cols-1 sm:grid-cols-[1fr_160px_140px_auto] gap-2 items-end">
        <label className="field">
          Search
          <input className="input" defaultValue={q} name="q" placeholder="Product, name or text" type="search" />
        </label>
        <label className="field">
          Status
          <select defaultValue={status ?? ""} name="status">
            <option value="">All</option>
            <option value="published">Published</option>
            <option value="hidden">Hidden</option>
          </select>
        </label>
        <label className="field">
          Rating
          <select defaultValue={rating ?? ""} name="rating">
            <option value="">Any</option>
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} star{n > 1 ? "s" : ""}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="btn" type="submit">
            Filter
          </button>
          <Link className="btn" href="/admin/reviews">
            Reset
          </Link>
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="muted">Tick reviews to act on several at once.</span>
        <div className="flex gap-2">
          <form action={deleteReviews} className="flex gap-2" id="bulk-reviews">
            <button className="btn" formAction={setReviewsStatus} name="status" type="submit" value="hidden">
              Hide selected
            </button>
            <button className="btn" formAction={setReviewsStatus} name="status" type="submit" value="published">
              Show selected
            </button>
            <ConfirmButton message="They will be removed from the product pages. This cannot be undone." selectionForm="bulk-reviews" title="Delete {n} selected review(s)?">
              Delete selected
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="panel overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th className="w-8">
                <SelectAll form="bulk-reviews" label="Select all reviews" />
              </th>
              <th>Review</th>
              <th>Product</th>
              <th>Client</th>
              <th>Status</th>
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reviews.map((r) => (
              <tr key={r.id}>
                <td className="align-top">
                  <input aria-label={`Select review by ${r.name}`} form="bulk-reviews" name="ids" type="checkbox" value={r.id} />
                </td>
                <td className="align-top max-w-md">
                  <div className="text-[#b5850b] tracking-wider" aria-label={`${r.rating} out of 5`}>
                    {stars(r.rating)}
                  </div>
                  <div className="font-medium">{r.title}</div>
                  <p className="muted whitespace-pre-line">{r.body}</p>
                  {r.photos.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {r.photos.map((p) => (
                        <a key={p.key} className="relative block w-12 h-12 rounded overflow-hidden bg-[#eee]" href={p.url} rel="noopener noreferrer" target="_blank">
                          <Image alt="" className="object-cover" fill sizes="48px" src={p.url} unoptimized />
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="muted text-xs mt-1">
                    {[r.size ? `EU ${r.size}` : null, fitOptions.find((f) => f.value === r.fit)?.label, date(r.createdAt)].filter(Boolean).join(" · ")}
                  </div>
                </td>
                <td className="align-top">
                  <Link className="link" href={`/products/${r.productSlug}#reviews-anchor`} target="_blank">
                    {r.productSlug}
                  </Link>
                </td>
                <td className="align-top">
                  {r.name}
                  <div className="muted text-xs">{r.email}</div>
                  {r.verified && <span className="tag tag-ok mt-1">Verified purchase</span>}
                </td>
                <td className="align-top">
                  <span className={`tag ${r.status === "published" ? "tag-ok" : "tag-muted"}`}>{r.status}</span>
                </td>
                <td className="align-top">
                  <div className="flex justify-end gap-2">
                    <form action={setReviewsStatus}>
                      <input name="ids" type="hidden" value={r.id} />
                      <input name="status" type="hidden" value={r.status === "published" ? "hidden" : "published"} />
                      <button className="btn" type="submit">
                        {r.status === "published" ? "Hide" : "Show"}
                      </button>
                    </form>
                    <form action={deleteReviews}>
                      <input name="ids" type="hidden" value={r.id} />
                      <ConfirmButton message="It will be removed from the product page. This cannot be undone." title={`Delete review by ${r.name}?`}>
                        Delete
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {reviews.length === 0 && (
              <tr>
                <td className="muted" colSpan={6}>
                  No reviews match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="muted">{reviews.length} review(s)</p>
    </div>
  );
}
