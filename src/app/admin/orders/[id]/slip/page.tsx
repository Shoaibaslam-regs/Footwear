import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { whatsappNumber } from "@/lib/data";
import { etaLabel, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders";
import { getOrderById } from "@/lib/server/orders";
import { pkr } from "@/components/admin/format";
import PrintButton from "@/components/admin/PrintButton";

export const metadata = { title: "Order slip" };

const WIDTHS = { "80": 80, "58": 58 } as const;

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });

/** +92 314 8428115 */
const phoneLabel = (digits: string) => `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;

/** Slip styles. Print shows only the slip, sized to the receipt roll. */
const css = (mm: number) => `
.pos-slip { width: ${mm}mm; padding: ${mm === 58 ? 3 : 4}mm; background: #fff; color: #000;
  font: ${mm === 58 ? 10 : 11}px/1.35 ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace; }
.pos-slip * { color: #000; }
.pos-slip .c { text-align: center; }
.pos-slip .rule { border: 0; border-top: 1px dashed #000; margin: 2.5mm 0; }
.pos-slip .rule2 { border: 0; border-top: 2px solid #000; margin: 2.5mm 0; }
.pos-slip .lbl { font-size: 0.82em; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
.pos-slip .row { display: flex; justify-content: space-between; gap: 2mm; }
.pos-slip .row > :last-child { text-align: right; white-space: nowrap; }
.pos-slip .brand { font: 700 ${mm === 58 ? 15 : 18}px/1.1 Georgia, "Times New Roman", serif; letter-spacing: 0.18em; }
.pos-slip .big { font-size: 1.45em; font-weight: 800; letter-spacing: 0.04em; }
.pos-slip .stamp { width: ${mm === 58 ? 26 : 30}mm; height: ${mm === 58 ? 26 : 30}mm; margin: 3mm auto 1mm; border: 2px solid #000;
  border-radius: 50%; outline: 1px solid #000; outline-offset: -5px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; text-align: center; transform: rotate(-10deg); }
.pos-slip .stamp b { font: 700 ${mm === 58 ? 9 : 10.5}px/1.1 Georgia, serif; letter-spacing: 0.12em; }
.pos-slip .stamp span { font-size: 7px; letter-spacing: 0.2em; }
@media screen { .pos-slip { box-shadow: 0 2px 14px rgb(0 0 0 / 0.15); margin: 0 auto; } }
@media print {
  @page { size: ${mm}mm 200mm; margin: 0; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  /* Take the admin chrome out of the layout (not just hide it), or Chrome shrinks the slip to fit its width. */
  .admin .a-topbar, .admin aside, .slip-toolbar { display: none !important; }
  .admin, .admin > div, .admin main, .slip-page, .slip-wrap { display: block !important; width: auto !important;
    max-width: none !important; min-width: 0 !important; margin: 0 !important; padding: 0 !important; overflow: visible !important; }
  body * { visibility: hidden !important; }
  .pos-slip, .pos-slip * { visibility: visible !important; }
  .pos-slip { position: absolute; left: 0; top: 0; box-shadow: none; }
  .pos-slip { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}`;

async function SlipContent({ params, searchParams }: PageProps<"/admin/orders/[id]/slip">) {
  await requireAdmin();
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const order = await getOrderById(id);
  if (!order) notFound();
  const w = sp.w === "58" ? "58" : "80";
  const mm = WIDTHS[w];
  const auto = sp.print === "1";
  const country = countries.find((c) => c.code === order.address.country)?.label ?? order.address.country;
  const pairs = order.items.reduce((n, i) => n + i.quantity, 0);
  const itemsTotal = order.items.reduce((n, i) => n + i.unitPrice * i.quantity, 0);
  const listDiscount = order.listTotal - itemsTotal;
  const couponOff = order.coupon && order.coupon.type !== "free_delivery" ? order.coupon.discount : 0;
  const base = `/admin/orders/${order.id}/slip`;

  return (
    <div className="slip-page flex flex-col gap-4">
      <style>{css(mm)}</style>

      <div className="slip-toolbar flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link className="link muted" href={`/admin/orders/${order.id}`}>
            ← {order.number}
          </Link>
          <h1 className="mt-1">Order slip</h1>
          <p className="muted">For a receipt printer. Pick your paper roll width, then print.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <nav aria-label="Paper width" className="a-seg">
            {(Object.keys(WIDTHS) as (keyof typeof WIDTHS)[]).map((k) => (
              <Link key={k} aria-current={k === w ? "page" : undefined} className="pill" href={k === "80" ? base : `${base}?w=${k}`} replace scroll={false}>
                {k} mm
              </Link>
            ))}
          </nav>
          <PrintButton auto={auto} widthMm={mm} />
        </div>
      </div>

      <div className="slip-wrap py-4 overflow-x-auto">
        <article aria-label={`Slip for order ${order.number}`} className="pos-slip">
          {/* Brand */}
          <div className="c">
            {/* eslint-disable-next-line @next/next/no-img-element -- printed at its natural size */}
            <img alt="" height={34} src="/icon.png" style={{ margin: "0 auto 1.5mm", filter: "grayscale(1) contrast(1.4)" }} width={34} />
            <div className="brand">ŔOSE ATELIER</div>
            <div style={{ marginTop: "1mm" }}>Handmade shoes · Karachi, Pakistan</div>
            <div>WhatsApp {phoneLabel(whatsappNumber)}</div>
          </div>

          <hr className="rule2" />

          <div className="c">
            <div className="lbl">Order</div>
            <div className="big">{order.number}</div>
            <div>{when(order.createdAt)}</div>
          </div>

          <hr className="rule" />

          {/* Customer */}
          <div className="lbl">Customer</div>
          <div style={{ fontWeight: 700 }}>{order.customer.name}</div>
          <div>{order.customer.phone}</div>
          <div style={{ wordBreak: "break-all" }}>{order.customer.email}</div>

          <div className="lbl" style={{ marginTop: "2mm" }}>
            Deliver to
          </div>
          <div>{order.address.line1}</div>
          {order.address.line2 && <div>{order.address.line2}</div>}
          <div>
            {order.address.city}
            {order.address.postalCode && ` ${order.address.postalCode}`}, {country}
          </div>

          <hr className="rule" />

          {/* Items */}
          <div className="row lbl">
            <span>Item</span>
            <span>Amount</span>
          </div>
          {order.items.map((i) => (
            <div key={`${i.slug}-${i.size}`} style={{ marginTop: "1.5mm" }}>
              <div style={{ fontWeight: 700 }}>{i.name}</div>
              <div className="row">
                <span>
                  EU {i.size} · {i.quantity} × {pkr(i.unitPrice)}
                </span>
                <span>{pkr(i.unitPrice * i.quantity)}</span>
              </div>
            </div>
          ))}

          <hr className="rule" />

          {/* Totals */}
          <div className="row">
            <span>
              Items ({pairs} {pairs === 1 ? "pair" : "pairs"})
            </span>
            <span>{pkr(order.listTotal)}</span>
          </div>
          {listDiscount > 0 && (
            <div className="row">
              <span>Sale discount</span>
              <span>−{pkr(listDiscount)}</span>
            </div>
          )}
          {order.coupon && (
            <div className="row">
              <span>Coupon {order.coupon.code}</span>
              <span>{order.coupon.type === "free_delivery" ? "Free delivery" : `−${pkr(couponOff)}`}</span>
            </div>
          )}
          <div className="row">
            <span>Delivery ({order.delivery.name})</span>
            <span>{order.shippingFee ? pkr(order.shippingFee) : "Free"}</span>
          </div>
          <hr className="rule2" />
          <div className="row big" style={{ fontSize: "1.25em" }}>
            <span>TOTAL</span>
            <span>{pkr(order.total)}</span>
          </div>
          <hr className="rule2" />

          {/* Payment and delivery */}
          <div className="row">
            <span>Payment</span>
            <span>{paymentMethodLabel(order.payment.method)}</span>
          </div>
          <div className="row">
            <span>Status</span>
            <span>{paymentStatusLabel[order.payment.status]}</span>
          </div>
          {order.payment.reference && (
            <div className="row">
              <span>Reference</span>
              <span>{order.payment.reference}</span>
            </div>
          )}
          {order.payment.method === "cod" && order.payment.status !== "paid" && (
            <div className="c" style={{ marginTop: "2mm", padding: "1.5mm", border: "1.5px solid #000", fontWeight: 800 }}>
              COLLECT {pkr(order.total)} ON DELIVERY
            </div>
          )}
          <div className="row" style={{ marginTop: "1.5mm" }}>
            <span>Order status</span>
            <span>{orderStatusLabel[order.status]}</span>
          </div>
          {order.eta && order.status !== "delivered" && order.status !== "cancelled" && (
            <div className="row">
              <span>Expected delivery</span>
              <span style={{ fontWeight: 700 }}>{etaLabel(order.eta)}</span>
            </div>
          )}
          {order.trackingNumber && (
            <div className="row">
              <span>Tracking</span>
              <span style={{ fontWeight: 700 }}>{order.trackingNumber}</span>
            </div>
          )}

          <hr className="rule" />

          {/* Brand stamp */}
          <div className="stamp" aria-hidden="true">
            <span>★ ORIGINAL ★</span>
            <b>ŔOSE</b>
            <b>ATELIER</b>
            <span>KARACHI</span>
          </div>
          <div className="c" style={{ marginTop: "2mm" }}>
            Thank you for shopping with us!
            <br />
            Questions? WhatsApp us.
          </div>
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
