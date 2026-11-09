import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import ProductForm from "@/components/admin/ProductForm";

export const metadata = { title: "New listing" };

export default async function NewProductPage() {
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
