import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { getPublishedProducts } from "@/lib/server/products";
import { listSaleEvents } from "@/lib/server/sale-events";
import SaleForm from "@/components/admin/SaleForm";

export const metadata = { title: "New sale" };

async function NewSaleContent() {
  await requireAdmin();
  const [listings, others] = await Promise.all([getPublishedProducts(), listSaleEvents()]);
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/sales">
          ← Sales
        </Link>
        <h1 className="mt-1">New sale</h1>
      </div>
      <SaleForm
        listings={listings.map((p) => ({ slug: p.slug, name: p.name, category: p.category, price: p.price, discountPercent: p.discountPercent }))}
        others={others}
      />
    </div>
  );
}

export default function NewSalePage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <NewSaleContent />
    </Suspense>
  );
}
