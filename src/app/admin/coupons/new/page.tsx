import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import CouponForm from "@/components/admin/CouponForm";

export const metadata = { title: "New coupon" };

async function NewCouponPageContent() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/coupons">
          ← Coupons
        </Link>
        <h1 className="mt-1">New coupon</h1>
      </div>
      <CouponForm />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function NewCouponPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <NewCouponPageContent />
    </Suspense>
  );
}
