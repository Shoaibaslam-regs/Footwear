import Link from "next/link";

export const PAGE_SIZES = [25, 50, 100] as const;

/** Reads `page` and `per` from the query, clamped to valid values. */
export function pageOf(sp: Record<string, string | string[] | undefined>, total: number) {
  const perRaw = Number(sp.per);
  const per = (PAGE_SIZES as readonly number[]).includes(perRaw) ? perRaw : 25;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(pages, Math.max(1, Math.floor(Number(sp.page)) || 1));
  return { page, per, pages, from: (page - 1) * per, to: Math.min(total, page * per) };
}

/** Same URL with some query keys replaced (undefined removes a key). */
export function withParams(
  path: string,
  sp: Record<string, string | string[] | undefined>,
  set: Record<string, string | number | undefined>,
) {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) if (typeof v === "string" && v !== "") q.set(k, v);
  for (const [k, v] of Object.entries(set)) {
    if (v === undefined || v === "") q.delete(k);
    else q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

/** "Showing 26–50 of 132" with previous/next, page numbers and a rows-per-page choice. */
export default function Pager({
  path,
  sp,
  total,
  noun,
}: {
  path: string;
  sp: Record<string, string | string[] | undefined>;
  total: number;
  noun: [string, string];
}) {
  const { page, per, pages, from, to } = pageOf(sp, total);
  if (total === 0) return null;
  const href = (p: number) => withParams(path, sp, { page: p === 1 ? undefined : p });
  // First, last, and a window of two around the current page.
  const nums = [...new Set([1, page - 2, page - 1, page, page + 1, page + 2, pages])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  return (
    <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3">
      <span className="muted">
        Showing {from + 1}–{to} of {total.toLocaleString("en-US")} {total === 1 ? noun[0] : noun[1]}
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {pages > 1 && (
          <>
            {page > 1 ? (
              <Link className="btn h-8" href={href(page - 1)} rel="prev">
                ← Previous
              </Link>
            ) : (
              <span aria-disabled="true" className="btn h-8 opacity-50">← Previous</span>
            )}
            {nums.map((n, i) => (
              <span key={n} className="flex items-center gap-1">
                {i > 0 && n - nums[i - 1] > 1 && <span className="muted px-1">…</span>}
                <Link aria-current={n === page ? "page" : undefined} className="pill h-8 px-3" href={href(n)}>
                  {n}
                </Link>
              </span>
            ))}
            {page < pages ? (
              <Link className="btn h-8" href={href(page + 1)} rel="next">
                Next →
              </Link>
            ) : (
              <span aria-disabled="true" className="btn h-8 opacity-50">Next →</span>
            )}
          </>
        )}
        <span className="muted ml-3">Rows</span>
        {PAGE_SIZES.map((n) => (
          <Link
            key={n}
            aria-current={n === per ? "page" : undefined}
            className="pill h-8 px-3"
            href={withParams(path, sp, { per: n === 25 ? undefined : n, page: undefined })}
          >
            {n}
          </Link>
        ))}
      </div>
    </nav>
  );
}
