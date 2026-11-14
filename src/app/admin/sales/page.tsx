import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getPublishedProducts } from "@/lib/server/products";
import { listSaleEventsNow } from "@/lib/server/sale-events";
import { categoryLabel } from "@/lib/products";
import { saleState, saleTime, upToPercent, type SaleEvent, type SaleState } from "@/lib/sale-events";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { deleteSale, stopSale } from "./actions";

export const metadata = { title: "Sales" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const stateTag: Record<SaleState, [string, string]> = {
  live: ["tag-ok", "Live"],
  scheduled: ["tag-info", "Scheduled"],
  ended: ["tag-muted", "Ended"],
};

function covers(e: SaleEvent) {
  if (e.scope === "all") return `${e.percent}% off the whole store`;
  if (e.scope === "categories") return `${e.percent}% off ${e.categories.map(categoryLabel).join(", ")}`;
  const n = Object.keys(e.items).length;
  return `${n} hand-picked ${n === 1 ? "shoe" : "shoes"}`;
}

async function AdminSalesContent({ searchParams }: PageProps<"/admin/sales">) {
  await requireAdmin();
  const [{ rows, now }, listings, sp] = await Promise.all([listSaleEventsNow(), getPublishedProducts(), searchParams]);
  const live = rows.filter((e) => saleState(e, now) === "live");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Sales</h1>
          <p className="muted">
            Store-wide sales like 11.11 or 12.12. Prices change by themselves when a sale starts and go back when it ends; listings are never edited. A highlighted banner shows at the top of the home page while it is live.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/sales/new">
          New sale
        </Link>
      </div>

      {one(sp.saved) && (
        <p className="notice notice-ok" role="status">
          Saved {one(sp.saved)}.
        </p>
      )}
      {one(sp.stopped) && (
        <p className="notice notice-ok" role="status">
          Sale stopped. Every price is back to normal.
        </p>
      )}
      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          Sale deleted. Orders that used it keep their record.
        </p>
      )}
      {live.length > 1 && (
        <p className="notice notice-warn" role="status">
          {live.length} sales are live at once. Shoes in more than one get the bigger discount.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          No sales yet
          <span className="muted">Create one with &ldquo;New sale&rdquo;, e.g. 11.11 Sale, 20% off the whole store.</span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Sale</th>
                <th>Discount</th>
                <th>When (Pakistan time)</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const state = saleState(e, now);
                const [tagClass, text] = stateTag[state];
                const upTo = upToPercent(e, listings);
                return (
                  <tr key={e.id}>
                    <td>
                      {e.stoppedAt ? (
                        <span className="font-semibold">{e.name}</span>
                      ) : (
                        <Link className="link font-semibold" href={`/admin/sales/${e.id}`}>
                          {e.name}
                        </Link>
                      )}
                      <div className="muted text-xs">Tag {e.tag}</div>
                    </td>
                    <td className="min-w-[14rem]">
                      <span className="font-semibold">{upTo > 0 ? `Up to ${upTo}% off` : "No published shoes"}</span>
                      <div className="muted text-xs">
                        {covers(e)}
                        {e.allowCoupons ? " · coupons allowed" : ""}
                      </div>
                    </td>
                    <td className="whitespace-nowrap">
                      {saleTime(e.startsAt)} →<br />
                      {saleTime(e.stoppedAt ?? e.endsAt)}
                      {e.stoppedAt && <div className="muted text-xs">Stopped early</div>}
                    </td>
                    <td>
                      <span className={`tag ${tagClass}`}>{text}</span>
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        {state !== "ended" && (
                          <form action={stopSale}>
                            <input name="id" type="hidden" value={e.id} />
                            <ConfirmButton
                              className="btn btn-sm"
                              confirmLabel={state === "live" ? "Stop sale" : "Cancel sale"}
                              message={state === "live" ? "Every price goes back to normal straight away." : "It will not start."}
                              title={`${state === "live" ? "Stop" : "Cancel"} ${e.name}?`}
                            >
                              {state === "live" ? "Stop" : "Cancel"}
                            </ConfirmButton>
                          </form>
                        )}
                        {state !== "live" && (
                          <form action={deleteSale}>
                            <input name="id" type="hidden" value={e.id} />
                            <ConfirmButton className="btn btn-sm btn-danger" message="Orders that used it keep their record." title={`Delete ${e.name}?`}>
                              Delete
                            </ConfirmButton>
                          </form>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/** Its own Suspense: requireAdmin() is async, see CLAUDE.md. */
export default function AdminSalesPage(props: PageProps<"/admin/sales">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminSalesContent {...props} />
    </Suspense>
  );
}
