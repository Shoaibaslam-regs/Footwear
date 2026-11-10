import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getCouponRow } from "@/lib/server/coupons";
import { pkr } from "@/components/admin/format";
import CouponForm from "@/components/admin/CouponForm";

export const metadata = { title: "Edit coupon" };

async function EditCouponPageContent({ params }: PageProps<"/admin/coupons/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const coupon = await getCouponRow(id);
  if (!coupon) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link className="link muted" href="/admin/coupons">
            ← Coupons
          </Link>
          <h1 className="mt-1 tracking-wider">{coupon.code}</h1>
          <p className="muted">
            Used {coupon.uses}
            {coupon.maxUses !== null ? ` of ${coupon.maxUses}` : ""} times · {pkr(coupon.discountGiven)} discount given ·{" "}
            <Link className="link" href={`/admin/orders?coupon=${encodeURIComponent(coupon.code)}`}>
              see its orders
            </Link>
          </p>
        </div>
        <Link className="btn" href={`/offers/${coupon.code}`} target="_blank">
          View offer page ↗
        </Link>
      </div>
      <CouponForm coupon={coupon} />
    </div>
  );
}

/**
 * Its own loading placeholder: the content checks coupon dates (the current time),
 * so it must stream inside the page rather than block navigation to it.
 */
export default function EditCouponPage(props: PageProps<"/admin/coupons/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <EditCouponPageContent {...props} />
    </Suspense>
  );
}
