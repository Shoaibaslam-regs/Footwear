"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveSale, type SaleFormState } from "@/app/admin/sales/actions";
import { MAX_DISCOUNT, productCategories, type ProductCategory } from "@/lib/products";
import { saleScopeLabel, saleScopes, upToPercent, type SaleEvent, type SaleScope } from "@/lib/sale-events";

export type SaleListing = { slug: string; name: string; category: ProductCategory; price: number; discountPercent: number };

function Err({ list }: { list?: string[] }) {
  return list?.length ? <span className="error">{list.join(" ")}</span> : null;
}

/** ISO → "YYYY-MM-DDTHH:MM" in Pakistan time, for datetime-local inputs. */
const toLocal = (iso: string) => new Date(Date.parse(iso) + 5 * 3_600_000).toISOString().slice(0, 16);
const fromLocal = (v: string) => (v ? Date.parse(`${v}:00+05:00`) : NaN);
const rs = (n: number) => `Rs ${Math.round(n).toLocaleString("en-US")}`;

/** Create or edit a sale event (lib/sale-events.ts). */
export default function SaleForm({ sale, listings, others }: { sale?: SaleEvent; listings: SaleListing[]; others: SaleEvent[] }) {
  const [state, action, pending] = useActionState<SaleFormState, FormData>(saveSale, undefined);
  const [name, setName] = useState(sale?.name ?? "");
  const [tag, setTag] = useState(sale?.tag ?? "");
  const [headline, setHeadline] = useState(sale?.headline ?? "");
  const [startsAt, setStartsAt] = useState(sale ? toLocal(sale.startsAt) : "");
  const [endsAt, setEndsAt] = useState(sale ? toLocal(sale.endsAt) : "");
  const [scope, setScope] = useState<SaleScope>(sale?.scope ?? "all");
  const [percent, setPercent] = useState(String(sale?.percent || 20));
  const [categories, setCategories] = useState<ProductCategory[]>(sale?.categories ?? []);
  const [items, setItems] = useState<Record<string, string>>(() =>
    Object.fromEntries(Object.entries(sale?.items ?? {}).map(([k, v]) => [k, String(v)])),
  );
  const e = state?.errors ?? {};

  // What customers will see, worked out like the storefront does.
  const draft: SaleEvent = {
    id: sale?.id ?? "draft",
    name: name || "Sale",
    tag,
    headline,
    startsAt: new Date(fromLocal(startsAt) || 0).toISOString(),
    endsAt: new Date(fromLocal(endsAt) || 0).toISOString(),
    scope,
    percent: Number(percent) || 0,
    categories,
    items: Object.fromEntries(Object.entries(items).filter(([, v]) => v.trim() !== "").map(([k, v]) => [k, Number(v) || 0])),
    countdown: true,
    teaser: true,
    allowCoupons: false,
    stoppedAt: null,
  };
  const upTo = upToPercent(draft, listings);
  const covered = listings.filter((l) => upToPercent(draft, [l]) > 0).length;
  const s = fromLocal(startsAt);
  const en = fromLocal(endsAt);
  const overlaps = others.filter((o) => o.id !== sale?.id && !o.stoppedAt && s < Date.parse(o.endsAt) && en > Date.parse(o.startsAt));

  return (
    <form action={action} className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_320px] gap-4" noValidate>
      {sale && <input name="id" type="hidden" value={sale.id} />}

      <div className="panel p-4 flex flex-col gap-5 min-w-0">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="field">
            Name
            <input className="input" maxLength={40} name="name" onChange={(ev) => setName(ev.target.value)} placeholder="11.11 Sale" value={name} />
            <Err list={e.name} />
          </label>
          <label className="field">
            Tag on cards
            <input className="input uppercase" maxLength={12} name="tag" onChange={(ev) => setTag(ev.target.value)} placeholder="11.11" value={tag} />
            <span className="muted font-normal text-xs">A few characters shown next to sale prices.</span>
            <Err list={e.tag} />
          </label>
          <label className="field sm:col-span-2">
            Line under the name (optional)
            <input className="input" maxLength={80} name="headline" onChange={(ev) => setHeadline(ev.target.value)} placeholder="On heels and bridal shoes" value={headline} />
            <Err list={e.headline} />
          </label>
          <label className="field">
            Starts (Pakistan time)
            <input className="input" name="startsAt" onChange={(ev) => setStartsAt(ev.target.value)} type="datetime-local" value={startsAt} />
            <Err list={e.startsAt} />
          </label>
          <label className="field">
            Ends (Pakistan time)
            <input className="input" name="endsAt" onChange={(ev) => setEndsAt(ev.target.value)} type="datetime-local" value={endsAt} />
            <Err list={e.endsAt} />
          </label>
        </div>

        <fieldset className="flex flex-col gap-3">
          <legend className="font-semibold mb-1">What is discounted</legend>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            {saleScopes.map((v) => (
              <label key={v} className="flex items-center gap-2 font-normal">
                <input checked={scope === v} name="scope" onChange={() => setScope(v)} type="radio" value={v} />
                {saleScopeLabel[v]}
              </label>
            ))}
          </div>

          {scope !== "items" && (
            <label className="field max-w-[12rem]">
              Percent off
              <input className="input" inputMode="numeric" max={MAX_DISCOUNT} min={1} name="percent" onChange={(ev) => setPercent(ev.target.value)} step={1} type="number" value={percent} />
              <Err list={e.percent} />
            </label>
          )}

          {scope === "categories" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex flex-wrap gap-x-5 gap-y-2">
                {productCategories.map((c) => (
                  <label key={c.value} className="flex items-center gap-2 font-normal">
                    <input
                      checked={categories.includes(c.value)}
                      name="categories"
                      onChange={(ev) => setCategories((list) => (ev.target.checked ? [...list, c.value] : list.filter((x) => x !== c.value)))}
                      type="checkbox"
                      value={c.value}
                    />
                    {c.label}
                  </label>
                ))}
              </div>
              <Err list={e.categories} />
            </div>
          )}

          {scope === "items" && (
            <div className="flex flex-col gap-1.5">
              <span className="muted text-xs">Give a percent to each shoe in the sale; leave the others blank.</span>
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Shoe</th>
                      <th className="text-right">Price</th>
                      <th className="text-right">% off</th>
                      <th className="text-right">Sale price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => {
                      const v = items[l.slug] ?? "";
                      const n = Number(v) || 0;
                      return (
                        <tr key={l.slug}>
                          <td>
                            {l.name}
                            {l.discountPercent > 0 && <span className="muted text-xs"> · already −{l.discountPercent}%</span>}
                          </td>
                          <td className="text-right whitespace-nowrap">{rs(l.price)}</td>
                          <td className="text-right">
                            <input
                              aria-label={`Percent off ${l.name}`}
                              className="input w-20 text-right"
                              inputMode="numeric"
                              max={MAX_DISCOUNT}
                              min={1}
                              name={`item:${l.slug}`}
                              onChange={(ev) => setItems((m) => ({ ...m, [l.slug]: ev.target.value }))}
                              step={1}
                              type="number"
                              value={v}
                            />
                          </td>
                          <td className="text-right whitespace-nowrap">{n > 0 ? rs((l.price * (100 - Math.max(n, l.discountPercent))) / 100) : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <Err list={e.items} />
            </div>
          )}
          <span className="muted text-xs">
            A shoe that already has a bigger discount of its own keeps it; the two are never added together. Prices go back by themselves when the sale ends.
          </span>
        </fieldset>

        <fieldset className="flex flex-col gap-2.5">
          <legend className="font-semibold mb-1">Options</legend>
          <label className="flex items-start gap-2">
            <input className="mt-1" defaultChecked={sale?.countdown ?? true} name="countdown" type="checkbox" />
            <span>
              Show a countdown
              <span className="block muted text-xs">&ldquo;Ends in 1d 04:22:10&rdquo; on the banner. Untick for quieter sales.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input className="mt-1" defaultChecked={sale?.teaser ?? true} name="teaser" type="checkbox" />
            <span>
              Tease it before it starts
              <span className="block muted text-xs">A &ldquo;Coming soon · Starts in…&rdquo; banner up to 3 days before.</span>
            </span>
          </label>
          <label className="flex items-start gap-2">
            <input className="mt-1" defaultChecked={sale?.allowCoupons ?? false} name="allowCoupons" type="checkbox" />
            <span>
              Allow coupons on sale prices
              <span className="block muted text-xs">Off: coupons that are &ldquo;full price only&rdquo; skip sale pairs, as they do listing discounts.</span>
            </span>
          </label>
        </fieldset>
      </div>

      <div className="flex flex-col gap-3">
        <div className="panel p-4 flex flex-col gap-3">
          <span className="muted text-xs">Banner preview</span>
          <div className="bg-[var(--color-primary)] text-[var(--color-surface-container-lowest)] px-4 py-3 flex flex-col gap-1">
            <span className="italic text-lg text-[var(--color-secondary-fixed)]" style={{ fontFamily: "var(--font-playfair)" }}>
              {name || "Sale name"}
            </span>
            <span className="text-[11px] uppercase tracking-[0.2em]">
              {upTo > 0 ? `Up to ${upTo}% off` : "No shoes in this sale yet"}
              {headline && ` · ${headline}`}
            </span>
            <span className="text-[11px] uppercase tracking-[0.18em] opacity-80">Ends in 1d 04:22:10 · Shop the Sale →</span>
          </div>
          <p className="muted text-xs">
            {covered} of {listings.length} published {listings.length === 1 ? "shoe" : "shoes"} in the sale. &ldquo;Up to&rdquo; is worked out from them, so it is always true.
          </p>
          {overlaps.length > 0 && (
            <p className="notice notice-warn text-xs" role="status">
              Overlaps {overlaps.map((o) => o.name).join(", ")}. Shoes in both get the bigger discount.
            </p>
          )}
        </div>
        {state?.message && (
          <p className="error" role="alert">
            {state.message}
          </p>
        )}
        <div className="flex gap-2">
          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "Saving…" : sale ? "Save changes" : "Create sale"}
          </button>
          <Link className="btn" href="/admin/sales">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}
