import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { couponConditions, couponHeadline, dayMonth, type CouponTerms } from "@/lib/coupons";
import { listCoupons, type CouponRow, type CouponState } from "@/lib/server/coupons";
import { siteUrl } from "@/lib/server/mail";
import { date, pkr } from "@/components/admin/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CouponShare from "@/components/admin/CouponShare";
import { deleteCoupon, setCouponActive } from "./actions";

export const metadata = { title: "Coupons" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const stateTag: Record<CouponState, [string, string]> = {
  active: ["tag-ok", "Active"],
  scheduled: ["tag-info", "Scheduled"],
  paused: ["tag-muted", "Paused"],
  expired: ["tag-muted", "Expired"],
  used_up: ["tag-warn", "Used up"],
};

const rowTerms = (c: CouponRow): CouponTerms => ({
  code: c.code,
  type: c.type,
  value: c.value,
  maxDiscount: c.maxDiscount,
  minOrder: c.minOrder,
  fullPriceOnly: c.fullPriceOnly,
  startsAt: c.startsAt,
  endsAt: c.endsAt,
  perCustomer: c.perCustomer,
  range: c.type === "random" ? [c.minPercent ?? 10, c.maxPercent ?? 60] : null,
});

async function AdminCouponsContent({ searchParams }: PageProps<"/admin/coupons">) {
  await requireAdmin();
  const [rows, sp, base] = await Promise.all([listCoupons(), searchParams, siteUrl()]);
  const saved = one(sp.saved);
  const live = rows.filter((c) => c.state === "active");
  const totals = {
    orders: rows.reduce((n, c) => n + c.orders, 0),
    discount: rows.reduce((n, c) => n + c.discountGiven, 0),
    sales: rows.reduce((n, c) => n + c.sales, 0),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Coupons</h1>
          <p className="muted">
            Codes customers type at checkout. One coupon per order, checked again when the order is placed. Cancelling an order gives the use back.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/coupons/new">
          New coupon
        </Link>
      </div>

      {saved && (
        <p className="notice notice-ok" role="status">
          Saved {saved}. Share its link below so customers can scratch and reveal it.
        </p>
      )}
      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          Coupon deleted.
        </p>
      )}
      {one(sp.error) === "used" && (
        <p className="notice notice-bad" role="alert">
          This coupon has been used on orders, so it can&apos;t be deleted. Pause it instead; past orders keep their record.
        </p>
      )}

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: "Active coupons", value: String(live.length) },
          { label: "Orders with a coupon", value: totals.orders.toLocaleString("en-US") },
          { label: "Discount given", value: pkr(totals.discount) },
          { label: "Sales with coupons", value: pkr(totals.sales) },
        ].map((s) => (
          <div key={s.label} className="panel p-4">
            <span className="block muted text-[13px]">{s.label}</span>
            <span className="block text-xl font-semibold whitespace-nowrap">{s.value}</span>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="empty">
          No coupons yet
          <span className="muted">Create one with &ldquo;New coupon&rdquo;, e.g. EID20 for 20% off.</span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Code</th>
                <th>Offer</th>
                <th>Dates</th>
                <th className="text-right">Used</th>
                <th className="text-right" title="Orders that used it and weren't cancelled">Orders · Sales</th>
                <th className="text-right">Discount given</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const t = rowTerms(c);
                const [tagClass, baseText] = stateTag[c.state];
                // For a surprise campaign "used up" means every card was handed out; the cards still work.
                const tagText = c.type === "random" && c.state === "used_up" ? "All cards given" : baseText;
                const url = `${base}/offers/${c.code}`;
                // Neither the code nor the discount: customers find out when they scratch.
                const message = `${c.type === "random" ? "A surprise discount is waiting for you" : "You have a special offer"} at Ŕose Atelier${c.endsAt ? ` (until ${dayMonth(c.endsAt)})` : ""}. Scratch your card to see it: ${url}`;
                return (
                  <tr key={c.id}>
                    <td>
                      <Link className="link font-semibold tracking-wider" href={`/admin/coupons/${c.id}`}>
                        {c.code}
                      </Link>
                      <div className="mt-1">
                        <CouponShare message={message} url={url} />
                      </div>
                    </td>
                    <td className="min-w-[14rem]">
                      <span className="font-semibold">{couponHeadline(t)}</span>
                      <div className="muted text-xs">{couponConditions(t).join(" · ")}</div>
                      {c.cards && (
                        <div className="text-xs mt-1">
                          {c.cards.given} {c.cards.given === 1 ? "card" : "cards"} given
                          {c.cards.avgPercent !== null && <span className="muted"> · average {c.cards.avgPercent}% off</span>}
                        </div>
                      )}
                    </td>
                    <td className="muted whitespace-nowrap text-[13px]">
                      {c.startsAt ? date(c.startsAt) : "Now"} → {c.endsAt ? date(c.endsAt) : "No end"}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {c.uses}
                      {c.maxUses !== null && <span className="muted"> / {c.maxUses}</span>}
                      {c.type === "random" && <div className="muted text-xs">cards</div>}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">
                      {c.orders}
                      <div className="muted text-xs">{pkr(c.sales)}</div>
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">{pkr(c.discountGiven)}</td>
                    <td>
                      <span className={`tag ${tagClass}`}>{tagText}</span>
                      <div className="muted text-xs mt-1">{c.public ? "On website" : "Link only"}</div>
                    </td>
                    <td>
                      <div className="flex justify-end gap-1.5 whitespace-nowrap">
                        <form action={setCouponActive}>
                          <input name="id" type="hidden" value={c.id} />
                          <input name="active" type="hidden" value={c.active ? "false" : "true"} />
                          <button className="btn btn-sm" type="submit">
                            {c.active ? "Pause" : "Activate"}
                          </button>
                        </form>
                        <Link className="btn btn-sm" href={`/admin/coupons/${c.id}`}>
                          Edit
                        </Link>
                        {c.uses === 0 && c.orders === 0 && (
                          <form action={deleteCoupon}>
                            <input name="id" type="hidden" value={c.id} />
                            <ConfirmButton className="btn btn-sm btn-danger" message="It has never been used. This cannot be undone." title={`Delete coupon ${c.code}?`}>
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
      <p className="muted text-xs">Created dates and limits use Pakistan time. Coupons made: {rows.length}{rows[0] ? ` · newest ${date(rows[0].createdAt)}` : ""}.</p>
    </div>
  );
}

/**
 * Its own loading placeholder: the content checks coupon dates (the current time),
 * so it must stream inside the page rather than block navigation to it.
 */
export default function AdminCoupons(props: PageProps<"/admin/coupons">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminCouponsContent {...props} />
    </Suspense>
  );
}
