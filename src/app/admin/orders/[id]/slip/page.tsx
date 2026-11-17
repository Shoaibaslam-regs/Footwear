import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { whatsappNumber } from "@/lib/data";
import { orderStatusLabel, paymentMethodLabel } from "@/lib/orders";
import { getOrderById } from "@/lib/server/orders";
import { pkr } from "@/components/admin/format";
import PrintButton, { type Paper } from "@/components/admin/PrintButton";
import BrandStamp from "@/components/BrandStamp";

export const metadata = { title: "Order slip" };

/** Sheet size and inner margin, in mm. */
const PAPERS: Record<Paper, { w: number; h: number; pad: number }> = {
  A5: { w: 148, h: 210, pad: 8 },
  A4: { w: 210, h: 297, pad: 14 },
};

const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Karachi",
  });

/** +92 314 8428115 */
const phoneLabel = (digits: string) =>
  `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;

/**
 * The order slip that goes in the parcel, laid out like an online store's
 * order summary: a centred letterhead, a personal thank-you, the order facts,
 * the pairs with photos, the summary and what to collect. Print shows only
 * the sheet.
 */
const css = (p: (typeof PAPERS)[Paper], s: boolean) => `
.order-slip { --ink: #1b1c1a; --muted: #75695f; --line: #e8e1dc; --gold: #b08d57; --accent: #6c5c44; --soft: #f8f5f2;
  width: ${p.w}mm; min-height: ${p.h}mm; padding: 0 ${p.pad}mm ${p.pad}mm; background: #fff; color: var(--ink); box-sizing: border-box;
  font: ${s ? 8.5 : 10}px/1.55 var(--font-jakarta), "Plus Jakarta Sans", system-ui, sans-serif; display: flex; flex-direction: column; }
.order-slip .serif { font-family: var(--font-playfair), Georgia, "Times New Roman", serif; font-weight: 400; }
.order-slip .eyebrow { font-size: ${s ? 6.5 : 7.5}px; font-weight: 700; letter-spacing: 0.22em; text-transform: uppercase; color: var(--accent); }
.order-slip .muted { color: var(--muted); }
/* Letterhead: the logo centred on top, the name under it, a thin rule. */
.order-slip .band { padding: ${s ? 4.5 : 8}mm 0 ${s ? 2.5 : 4}mm; border-bottom: 1px solid var(--accent);
  display: flex; flex-direction: column; align-items: center; text-align: center; }
.order-slip .band img { width: ${s ? 9 : 13}mm; height: auto; display: block; margin-bottom: ${s ? 1 : 2}mm; }
.order-slip .band .word { font-size: ${s ? 15 : 21}px; letter-spacing: 0.32em; line-height: 1.1; padding-left: 0.32em; }
.order-slip .band .loc { font-size: ${s ? 6 : 7}px; letter-spacing: 0.34em; text-transform: uppercase; color: var(--accent); margin-top: ${s ? 1 : 1.5}mm; padding-left: 0.34em; }
.order-slip .hello { padding: ${s ? 3 : 5}mm 0 ${s ? 2.5 : 4}mm; display: flex; justify-content: space-between; align-items: flex-end; gap: 6mm; }
.order-slip .hello .ord { text-align: right; white-space: nowrap; }
.order-slip .hello .ord .no { font-size: ${s ? 13 : 17}px; letter-spacing: 0.06em; margin-top: 0.5mm; }
.order-slip .hello h2 { font-size: ${s ? 16 : 26}px; line-height: 1.15; margin: 0 0 1.5mm; letter-spacing: -0.01em; }
.order-slip .hello h2 em { font-style: italic; color: var(--accent); }
.order-slip .facts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); border-top: 1px solid var(--ink); border-bottom: 1px solid var(--line); }
.order-slip .facts > div { padding: ${s ? 2.5 : 3.5}mm ${s ? 2 : 3}mm; min-width: 0; }
.order-slip .facts > div + div { border-left: 1px solid var(--line); }
.order-slip .facts b { display: block; font-size: ${s ? 9 : 11}px; font-weight: 600; margin-top: 0.8mm; overflow-wrap: anywhere; }
.order-slip .people { display: grid; grid-template-columns: 1fr 1fr; gap: ${s ? 4 : 8}mm; padding: ${s ? 2.5 : 4}mm 0; }
.order-slip .people .name { font-weight: 700; margin-top: 1mm; }
.order-slip .people .dest { display: block; margin-top: ${s ? 1.8 : 2.5}mm; margin-bottom: 0.5mm; }
.order-slip h3 { font-size: ${s ? 12 : 15}px; margin: ${s ? 2 : 3}mm 0 ${s ? 1.5 : 2}mm; display: flex; align-items: baseline; justify-content: space-between; }
.order-slip h3 span { font-family: var(--font-jakarta), system-ui, sans-serif; font-size: ${s ? 8 : 9}px; color: var(--muted); }
.order-slip .item { display: grid; grid-template-columns: ${s ? 10 : 15}mm minmax(0, 1fr) auto; gap: ${s ? 3 : 5}mm; align-items: center;
  padding: ${s ? 1.5 : 2.5}mm 0; border-top: 1px solid var(--line); break-inside: avoid; }
.order-slip .item:last-child { border-bottom: 1px solid var(--line); }
.order-slip .pic { width: ${s ? 10 : 15}mm; height: ${s ? 12 : 18}mm; object-fit: cover; background: var(--soft); display: block; }
.order-slip .item .nm { font-size: ${s ? 11 : 13.5}px; line-height: 1.25; }
.order-slip .chips { display: flex; flex-wrap: wrap; gap: ${s ? 1 : 1.5}mm; margin-top: ${s ? 1 : 1.5}mm; }
.order-slip .chip { border: 1px solid var(--line); padding: 0.4mm 2mm; font-size: ${s ? 7 : 8}px; letter-spacing: 0.08em; text-transform: uppercase; }
.order-slip .chip.sale { border-color: var(--gold); color: var(--accent); }
.order-slip .price { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
.order-slip .price b { font-size: ${s ? 10 : 12}px; font-weight: 600; }
.order-slip .was { text-decoration: line-through; color: var(--muted); }
.order-slip .bottom { display: grid; grid-template-columns: minmax(0, 1fr) ${s ? 60 : 78}mm; gap: ${s ? 5 : 10}mm; margin-top: ${s ? 4 : 6}mm; align-items: stretch; break-inside: avoid; }
/* Left: "Need help?" on top, the stamp at the bottom, level with the Cash on Delivery box. */
.order-slip .help { display: flex; flex-direction: column; align-items: flex-start; padding-top: ${s ? 2.5 : 4.5}mm; }
.order-slip .help p { margin: ${s ? 1.5 : 2}mm 0 0; line-height: 1.7; max-width: ${s ? 58 : 85}mm; }
.order-slip .help .stamp { margin-top: auto; }
.order-slip .summary { background: var(--soft); padding: ${s ? 2.5 : 4.5}mm; }
.order-slip .kv { display: flex; justify-content: space-between; gap: 3mm; padding: ${s ? 0.5 : 0.8}mm 0; font-variant-numeric: tabular-nums; }
.order-slip .kv > :last-child { text-align: right; white-space: nowrap; }
.order-slip .grand { border-top: 1px solid var(--ink); margin-top: 2mm; padding-top: 2.5mm; align-items: baseline; }
.order-slip .grand .serif { font-size: ${s ? 12 : 15}px; }
.order-slip .grand b { font-size: ${s ? 13 : 16}px; }
.order-slip .collect { margin-top: ${s ? 2.5 : 3.5}mm; border: 1.5px solid var(--ink); padding: ${s ? 3 : 4}mm ${s ? 3 : 4.5}mm;
  display: flex; align-items: flex-end; justify-content: space-between; flex-wrap: wrap; gap: 1mm 3mm; }
.order-slip .collect b { font-size: ${s ? 13 : 17}px; letter-spacing: 0.02em; white-space: nowrap; }
/* The brand seal (components/BrandStamp.tsx), slightly turned like a real stamp. */
.order-slip .stamp { width: ${s ? 22 : 30}mm; height: ${s ? 22 : 30}mm; transform: rotate(-8deg); margin-left: ${s ? 1 : 2}mm; display: block; }
.order-slip .paid { margin-top: ${s ? 2.5 : 3.5}mm; border: 1px solid var(--line); padding: ${s ? 3 : 4}mm ${s ? 3 : 4.5}mm; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 1mm 3mm; }
/* Big orders stay on one sheet: 4–7 different shoes get one-line rows with
   small photos, 8 or more drop the photos (classes set from the line count). */
.order-slip.compact .item, .order-slip.tight .item { grid-template-columns: ${s ? 5.5 : 8}mm minmax(0, 1fr) auto; gap: ${s ? 2 : 3}mm; padding: ${s ? 0.7 : 1.2}mm 0; }
.order-slip.compact .pic { width: ${s ? 5.5 : 8}mm; height: ${s ? 6.5 : 9.5}mm; }
.order-slip.tight .item { grid-template-columns: minmax(0, 1fr) auto; padding: ${s ? 0.8 : 1.2}mm 0; }
.order-slip.tight .pic { display: none; }
.order-slip.compact .item > div:nth-child(2), .order-slip.tight .item > div:first-of-type { display: flex; align-items: center; gap: ${s ? 2 : 3}mm; min-width: 0; }
.order-slip.compact .nm, .order-slip.tight .nm { font-size: ${s ? 9.5 : 11}px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.order-slip.compact .chips, .order-slip.tight .chips { margin-top: 0; flex-wrap: nowrap; flex-shrink: 0; }
.order-slip.compact .chip, .order-slip.tight .chip { padding: 0 1.4mm; font-size: ${s ? 6 : 7}px; }
.order-slip.compact .price, .order-slip.tight .price { display: flex; align-items: baseline; gap: 2mm; flex-direction: row-reverse; }
.order-slip.compact .price b, .order-slip.tight .price b { font-size: ${s ? 9 : 10.5}px; }
.order-slip.compact .price .muted, .order-slip.tight .price .muted { font-size: ${s ? 7 : 8}px; }
@media screen { .order-slip { box-shadow: 0 2px 18px rgb(0 0 0 / 0.14); margin: 0 auto; } }
@media print {
  @page { size: ${p.w === 210 ? "A4" : "A5"} portrait; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  /* Take the admin chrome out of the layout (not just hide it), or Chrome shrinks the sheet to fit. */
  .admin .a-topbar, .admin aside, .slip-toolbar { display: none !important; }
  .admin, .admin > div, .admin main, .slip-page, .slip-wrap { display: block !important; width: auto !important;
    max-width: none !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
  body * { visibility: hidden !important; }
  .order-slip, .order-slip * { visibility: visible !important; }
  .order-slip { position: absolute; left: 0; top: 0; box-shadow: none; min-height: ${p.h - 1}mm;
    -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

async function SlipContent({
  params,
  searchParams,
}: PageProps<"/admin/orders/[id]/slip">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderById(id);
  if (!order) notFound();
  // A5 (half an A4 sheet) is the usual packing-slip size; A4 for big orders.
  const paper: Paper = sp.paper === "a4" ? "A4" : "A5";
  const p = PAPERS[paper];
  const s = paper === "A5";
  const auto = sp.print === "1";
  const country =
    countries.find((c) => c.code === order.address.country)?.label ??
    order.address.country;
  const pairs = order.items.reduce((n, i) => n + i.quantity, 0);
  const itemsTotal = order.items.reduce(
    (n, i) => n + i.unitPrice * i.quantity,
    0,
  );
  const listDiscount = order.listTotal - itemsTotal;
  const couponOff =
    order.coupon && order.coupon.type !== "free_delivery"
      ? order.coupon.discount
      : 0;
  const base = `/admin/orders/${order.id}/slip`;
  const toCollect =
    order.payment.method === "cod" &&
    order.payment.status !== "paid" &&
    order.status !== "cancelled";
  const first = order.customer.name.split(" ")[0];
  // How tightly to list the pairs, so a big order still fits one sheet.
  const density = order.items.length <= 3 ? "" : order.items.length <= 7 ? " compact" : " tight";

  // What the rider collects (or "Paid"), right under the order total.
  const payBox = toCollect ? (
                <div className="collect">
                  <div>
                    <div className="eyebrow">Cash on Delivery</div>
                    <div className="muted">Amount to collect</div>
                  </div>
                  <b>{pkr(order.total)}</b>
                </div>
              ) : (
                order.payment.status === "paid" && (
                  <div className="paid">
                    <span className="eyebrow">Paid</span>
                    <span className="muted">Nothing to collect on delivery.</span>
                  </div>
                )
              );

  return (
    <div className="slip-page flex flex-col gap-4">
      <style>{css(p, s)}</style>

      <div className="slip-toolbar flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="link muted" href={`/admin/orders/${order.id}`}>
            ← {order.number}
          </Link>
          <h1 className="mt-1">Order slip</h1>
          <p className="muted">
            A page to print and put in the parcel. Pick the paper size, then
            print.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Paper size" className="a-seg">
            {(Object.keys(PAPERS) as Paper[]).map((k) => (
              <Link
                key={k}
                aria-current={k === paper ? "page" : undefined}
                className="pill"
                href={k === "A5" ? base : `${base}?paper=a4`}
                replace
                scroll={false}
              >
                {k}
              </Link>
            ))}
          </nav>
          <PrintButton auto={auto} />
        </div>
      </div>

      <div className="slip-wrap py-4 overflow-x-auto">
        <article
          aria-label={`Slip for order ${order.number}`}
          className={`order-slip${density}`}
        >
          {/* Letterhead */}
          <header className="band">
            {/* eslint-disable-next-line @next/next/no-img-element -- printed at its natural size */}
            <img alt="" height={60} src="/icon.png" width={60} />
            <div className="serif word">R&apos;OSE ATELIER</div>
            <div className="loc">Karachi · Pakistan</div>
          </header>

          {/* Thank-you, with the order number */}
          <section className="hello">
            <div>
              <h2 className="serif">
                Thank you, <em>{first}</em>.
              </h2>
              <p className="muted" style={{ margin: 0 }}>
                Here is everything in your parcel. We hope you love your new{" "}
                {pairs === 1 ? "pair" : "pairs"}.
              </p>
            </div>
            <div className="ord">
              <div className="eyebrow">Order</div>
              <div className="serif no">{order.number}</div>
            </div>
          </section>

          {/* Order facts */}
          <section className="facts">
            <div>
              <span className="eyebrow">Placed</span>
              <b>{day(order.createdAt)}</b>
            </div>
            <div>
              <span className="eyebrow">Payment</span>
              <b>{paymentMethodLabel(order.payment.method)}</b>
            </div>
            <div>
              <span className="eyebrow">Delivery</span>
              <b>{order.delivery.name}</b>
            </div>
            <div>
              {order.trackingNumber ? (
                <>
                  <span className="eyebrow">Tracking</span>
                  <b>{order.trackingNumber}</b>
                </>
              ) : (
                <>
                  <span className="eyebrow">Status</span>
                  <b>{orderStatusLabel[order.status]}</b>
                </>
              )}
            </div>
          </section>

          {/* Who and where */}
          <section className="people">
            <div>
              <span className="eyebrow">Delivering to</span>
              <div className="name">{order.customer.name}</div>
              <span className="eyebrow dest">Destination</span>
              <div>{order.address.line1}</div>
              {order.address.line2 && <div>{order.address.line2}</div>}
              <div>
                {order.address.city}
                {order.address.postalCode &&
                  ` ${order.address.postalCode}`}, {country}
              </div>
            </div>
            <div>
              <span className="eyebrow">Contact</span>
              <div className="name">{order.customer.phone}</div>
              <div className="muted" style={{ overflowWrap: "anywhere" }}>
                {order.customer.email}
              </div>
            </div>
          </section>

          {/* The pairs */}
          <h3 className="serif">
            In your parcel{" "}
            <span>
              {pairs} {pairs === 1 ? "pair" : "pairs"}
            </span>
          </h3>
          <div>
            {order.items.map((i) => (
              <div key={`${i.slug}-${i.size}`} className="item">
                {/* eslint-disable-next-line @next/next/no-img-element -- plain img prints reliably */}
                <img alt={i.alt} className="pic" src={i.image} />
                <div>
                  <div className="serif nm">{i.name}</div>
                  <div className="chips">
                    <span className="chip">EU {i.size}</span>
                    <span className="chip">Qty {i.quantity}</span>
                    {i.sale ? (
                      <span className="chip sale">{i.sale.name}</span>
                    ) : (
                      i.discountPercent > 0 && (
                        <span className="chip sale">
                          {i.discountPercent}% off
                        </span>
                      )
                    )}
                  </div>
                </div>
                <div className="price">
                  <b>{pkr(i.unitPrice * i.quantity)}</b>
                  <div className="muted">
                    {i.listPrice > i.unitPrice && (
                      <span className="was">{pkr(i.listPrice)}</span>
                    )}{" "}
                    {i.quantity > 1 || i.listPrice > i.unitPrice
                      ? `${pkr(i.unitPrice)} each`
                      : ""}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Help and summary */}
          <section className="bottom">
            <div className="help">
              <span className="eyebrow">Need help?</span>
              <p>
                Questions, or need an exchange? Message us on WhatsApp at{" "}
                <strong>{phoneLabel(whatsappNumber)}</strong> with your order number.
              </p>
              <BrandStamp className="stamp" />
            </div>
            <div>
            <div className="summary">
              <div className="eyebrow" style={{ marginBottom: "1.5mm" }}>
                Order summary
              </div>
              <div className="kv">
                <span className="muted">Subtotal</span>
                <span>{pkr(order.listTotal)}</span>
              </div>
              {listDiscount > 0 && (
                <div className="kv">
                  <span className="muted">Discount</span>
                  <span>−{pkr(listDiscount)}</span>
                </div>
              )}
              {order.coupon && (
                <div className="kv">
                  <span className="muted">Coupon {order.coupon.code}</span>
                  <span>
                    {order.coupon.type === "free_delivery"
                      ? "Free delivery"
                      : `−${pkr(couponOff)}`}
                  </span>
                </div>
              )}
              <div className="kv">
                <span className="muted">Delivery</span>
                <span>
                  {order.shippingFee ? pkr(order.shippingFee) : "Free"}
                </span>
              </div>
              <div className="kv grand">
                <span className="serif">Total</span>
                <b>{pkr(order.total)}</b>
              </div>
            </div>
              {payBox}
            </div>
          </section>

        </article>
      </div>
    </div>
  );
}

export default function OrderSlip(props: PageProps<"/admin/orders/[id]/slip">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <SlipContent {...props} />
    </Suspense>
  );
}
