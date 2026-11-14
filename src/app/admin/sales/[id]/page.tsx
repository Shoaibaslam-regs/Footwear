import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getPublishedProducts } from "@/lib/server/products";
import { getSaleEvent, listSaleEvents } from "@/lib/server/sale-events";
import SaleForm from "@/components/admin/SaleForm";

export const metadata = { title: "Edit sale" };

async function EditSaleContent({ params }: PageProps<"/admin/sales/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [sale, listings, others] = await Promise.all([getSaleEvent(id), getPublishedProducts(), listSaleEvents()]);
  if (!sale || sale.stoppedAt) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/sales">
          ← Sales
        </Link>
        <h1 className="mt-1">{sale.name}</h1>
      </div>
      <SaleForm
        listings={listings.map((p) => ({ slug: p.slug, name: p.name, category: p.category, price: p.price, discountPercent: p.discountPercent }))}
        others={others}
        sale={sale}
      />
    </div>
  );
}

export default function EditSalePage(props: PageProps<"/admin/sales/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <EditSaleContent {...props} />
    </Suspense>
  );
}
