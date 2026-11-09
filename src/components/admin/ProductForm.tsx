"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveProduct, type ProductFormState } from "@/app/admin/actions";
import GalleryUploader from "./GalleryUploader";
import { ALL_SIZES, MAX_DISCOUNT, productCategories, salePrice, type Listing } from "@/lib/products";

function Err({ list }: { list?: string[] }) {
  return list?.length ? <span className="error">{list.join(" ")}</span> : null;
}

export default function ProductForm({ product }: { product?: Listing }) {
  const [state, action, pending] = useActionState<ProductFormState, FormData>(saveProduct, undefined);
  const [price, setPrice] = useState(String(product?.price ?? ""));
  const [discount, setDiscount] = useState(String(product?.discountPercent ?? 0));
  const pricePreview = salePrice({ price: Number(price) || 0, discountPercent: Number(discount) || 0 });
  const e = state?.errors ?? {};
  const sizes = product?.sizes ?? [...ALL_SIZES];
  const soldOut = product?.soldOutSizes ?? [];

  return (
    <form action={action} className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4" noValidate>
      {product && <input name="id" type="hidden" value={product.id} />}

      <div className="panel p-4 flex flex-col gap-4 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="field">
            Name
            <input className="input" defaultValue={product?.name} name="name" required />
            <Err list={e.name} />
          </label>
          <label className="field">
            Web address (slug) <span className="muted font-normal">(leave blank to use the name)</span>
            <input className="input" defaultValue={product?.slug} name="slug" placeholder="aurelia-stiletto" />
            <Err list={e.slug} />
          </label>
          <label className="field">
            Category
            <select defaultValue={product?.category ?? "heels"} name="category">
              {productCategories.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
            <Err list={e.category} />
          </label>
          <label className="field">
            Price (PKR)
            <input className="input" inputMode="numeric" min={0} name="price" onChange={(ev) => setPrice(ev.target.value)} required step={1} type="number" value={price} />
            <Err list={e.price} />
          </label>
          <label className="field">
            Discount (%) <span className="muted font-normal">(0 = no discount)</span>
            <input className="input" inputMode="numeric" max={MAX_DISCOUNT} min={0} name="discountPercent" onChange={(ev) => setDiscount(ev.target.value)} step={1} type="number" value={discount} />
            <span className="muted font-normal text-xs" aria-live="polite">
              {Number(discount) > 0 && Number(price) > 0
                ? `Customers pay PKR ${pricePreview.toLocaleString("en-US")} (was PKR ${Number(price).toLocaleString("en-US")})`
                : "Shown as a sale badge with the original price struck through."}
            </span>
            <Err list={e.discountPercent} />
          </label>
          <label className="field">
            Sales from other channels <span className="muted font-normal">(pairs)</span>
            <input className="input" defaultValue={product?.otherSales ?? 0} inputMode="numeric" min={0} name="otherSales" step={1} type="number" />
            <span className="muted font-normal text-xs">
              Pairs sold in your boutique, on Instagram/WhatsApp or before launch. Added to website orders for the
              &ldquo;N sold&rdquo; figure on the store. Only enter real sales: invented numbers can count as misleading advertising.
            </span>
            <Err list={e.otherSales} />
          </label>
          <label className="field">
            Spec <span className="muted font-normal">(e.g. Block Heel • 95mm)</span>
            <input className="input" defaultValue={product?.spec} name="spec" />
            <Err list={e.spec} />
          </label>
          <label className="field">
            Material
            <input className="input" defaultValue={product?.material} name="material" required />
            <Err list={e.material} />
          </label>
          <label className="field">
            Badge <span className="muted font-normal">(optional)</span>
            <input className="input" defaultValue={product?.badge} name="badge" placeholder="New In" />
            <Err list={e.badge} />
          </label>
        </div>

        <label className="field">
          Description <span className="muted font-normal">(optional, shown on the product page)</span>
          <textarea defaultValue={product?.description} name="description" rows={4} />
          <Err list={e.description} />
        </label>

        <fieldset className="flex flex-col gap-2 min-w-0">
          <legend className="font-medium mb-1">Sizes (EU)</legend>
          <div className="overflow-x-auto">
            <table className="w-auto">
              <thead>
                <tr>
                  <th />
                  {ALL_SIZES.map((s) => (
                    <th key={s} className="text-center">
                      {s}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="muted">Offered</td>
                  {ALL_SIZES.map((s) => (
                    <td key={s} className="text-center">
                      <input aria-label={`Offer EU ${s}`} defaultChecked={sizes.includes(s)} name="sizes" type="checkbox" value={s} />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="muted whitespace-nowrap">Stock</td>
                  {ALL_SIZES.map((s) => {
                    const tracked = product?.stock?.[String(s)];
                    return (
                      <td key={s} className="text-center">
                        <input
                          aria-label={`Pairs in stock, EU ${s}`}
                          className="input w-14 h-8 px-1 text-center"
                          defaultValue={typeof tracked === "number" ? tracked : soldOut.includes(s) ? 0 : ""}
                          inputMode="numeric"
                          min={0}
                          name={`stock:${s}`}
                          placeholder="∞"
                          type="number"
                        />
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="muted text-xs">Stock: pairs available per size. Leave blank to not track (always available); 0 = sold out. Orders reduce it automatically and cancellations put it back.</p>
          <Err list={e.sizes} />
          <Err list={e.stock} />
        </fieldset>

        <div className="border-t border-[var(--a-line)] pt-4">
          <GalleryUploader error={e.gallery} initial={product?.gallery} productName={product?.name} />
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="panel p-4 flex flex-col gap-3">
          <label className="field">
            Status
            <select defaultValue={product?.status ?? "draft"} name="status">
              <option value="draft">Draft (hidden)</option>
              <option value="published">Published</option>
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input defaultChecked={product?.newArrival} name="newArrival" type="checkbox" />
            Show in New Arrivals
          </label>
          <label className="flex items-center gap-2">
            <input defaultChecked={product?.bestSeller} name="bestSeller" type="checkbox" />
            Show in Best Sellers
          </label>
        </div>

        {state?.message && (
          <p className="error" role="alert">
            {state.message}
          </p>
        )}
        <div className="flex gap-2">
          <button className="btn btn-primary flex-1" disabled={pending} type="submit">
            {pending ? "Saving…" : product ? "Save changes" : "Create listing"}
          </button>
          <Link className="btn" href="/admin/products">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
