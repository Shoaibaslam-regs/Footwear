const pageBtn =
  "w-10 h-10 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface font-label-uppercase text-xs font-semibold transition-colors";
const arrow =
  "w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

/** 1 … 4 5 6 … 12 style page list. */
function pageList(page: number, pages: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) out.push(n);
    else if (out[out.length - 1] !== "…") out.push("…");
  }
  return out;
}

export default function Pagination({
  page,
  pages,
  total,
  pageSize,
  onPage,
}: {
  page: number;
  pages: number;
  total: number;
  pageSize: number;
  onPage: (n: number) => void;
}) {
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-space-md pt-space-xl pb-space-lg">
      <p className="font-body-sm text-body-sm text-on-surface-variant">
        Viewing {from}–{to} of {total} atelier {total === 1 ? "creation" : "creations"}
      </p>
      {pages > 1 && (
        <nav aria-label="Pagination" className="flex items-center gap-1">
          <button aria-label="Previous page" className={arrow} disabled={page === 1} onClick={() => onPage(page - 1)} type="button">
            <span className="material-symbols-outlined text-[18px]">chevron_left</span>
          </button>
          {pageList(page, pages).map((n, i) =>
            n === "…" ? (
              <span key={`gap-${i}`} className="px-2 text-outline font-label-uppercase text-xs">
                …
              </span>
            ) : n === page ? (
              <button
                key={n}
                aria-current="page"
                className="w-10 h-10 rounded-full bg-primary text-on-primary font-label-uppercase text-xs font-semibold shadow-sm"
                type="button"
              >
                {n}
              </button>
            ) : (
              <button key={n} aria-label={`Page ${n}`} className={pageBtn} onClick={() => onPage(n)} type="button">
                {n}
              </button>
            ),
          )}
          <button aria-label="Next page" className={arrow} disabled={page === pages} onClick={() => onPage(page + 1)} type="button">
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </nav>
      )}
    </div>
  );
}
