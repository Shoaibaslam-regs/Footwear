import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import CouponForm from "@/components/admin/CouponForm";

export const metadata = { title: "New coupon" };

export default async function NewCouponPage() {
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
