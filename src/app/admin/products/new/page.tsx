import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "New listing" };

async function NewProductPageContent() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/products">
          ← Listings
        </Link>
        <h1 className="mt-1">New listing</h1>
      </div>
      <ProductForm />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function NewProductPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <NewProductPageContent />
    </Suspense>
  );
}
