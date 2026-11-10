import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { productHref } from "@/lib/products";
import { getProductById } from "@/lib/server/products";
import ProductForm from "@/components/admin/ProductForm";
import ConfirmButton from "@/components/admin/ConfirmButton";
import ListingTabs from "@/components/admin/ListingTabs";
import { deleteProduct } from "../../actions";

export const metadata = { title: "Edit listing" };

async function EditProductPageContent({ params }: PageProps<"/admin/products/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <Link className="link muted" href="/admin/products">
            ← Listings
          </Link>
          <h1 className="mt-1">{product.name}</h1>
        </div>
        <div className="flex gap-2">
          {product.status === "published" && (
            <Link className="btn" href={productHref(product)} target="_blank">
              View on store
            </Link>
          )}
          <form action={deleteProduct}>
            <input name="id" type="hidden" value={product.id} />
            <ConfirmButton message="It will be removed from the website. This cannot be undone." title={`Delete “${product.name}”?`}>
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
      <ListingTabs current="edit" id={product.id} />
      <ProductForm key={product.updatedAt} product={product} />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function EditProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <EditProductPageContent {...props} />
    </Suspense>
  );
}
