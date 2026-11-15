import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { whatsappUrl } from "@/lib/data";
import { etaLabel, paymentMethodLabel, paymentStatusLabel, type Order, type OrderStatus } from "@/lib/orders";
import { getOrderForUser, statusDates } from "@/lib/server/orders";
import Price from "@/components/Price";
import CancelOrderButton from "@/components/account/CancelOrderButton";

export const metadata: Metadata = { title: "Order — Ŕose Atelier", robots: { index: false } };

/**
 * The customer's order tracking page, laid out like an atelier commission
 * (the owner's design): header with the key facts, the five-step journey,
 * the pieces ordered, and the delivery details card. Only real order data is
 * shown: status dates, the expected delivery set by the store, the courier
 * tracking number. Internal admin notes from the history are never shown.
 */

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Karachi" });

const card = "bg-surface-container-lowest shadow-sm ring-1 ring-outline-variant/30";
const eyebrow = "block font-label-uppercase text-[10px] sm:text-[11px] font-medium uppercase tracking-[0.28em] text-secondary";
const factLabel = "block font-label-uppercase text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-outline";
const factValue = "block font-body-md text-[14px] sm:text-[15px] text-primary";
const btnDark =
  "h-11 px-space-md bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 transition-colors";
const btnLight =
  "h-11 px-space-md bg-surface-container text-primary hover:bg-surface-container-high font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 transition-colors";

/** The journey in five steps ("Shipped" and "Out for delivery" share "On the way"). */
const journey: { statuses: OrderStatus[]; title: string; text: string; icon: string }[] = [
  { statuses: ["pending"], title: "Order Placed", text: "We received your order.", icon: "receipt_long" },
  { statuses: ["confirmed"], title: "Confirmed", text: "We checked your order and your details.", icon: "verified" },
  { statuses: ["processing"], title: "Being Prepared", text: "Your pairs are checked, wrapped and boxed.", icon: "inventory_2" },
  { statuses: ["shipped", "out_for_delivery"], title: "On the Way", text: "With the courier, on its way to you.", icon: "local_shipping" },
  { statuses: ["delivered"], title: "Delivered", text: "Handed over to you. Enjoy your new pair.", icon: "task_alt" },
];
const stepOf = (s: OrderStatus) => journey.findIndex((j) => j.statuses.includes(s));

/** The latest real news for the banner under the journey. */
function latestNews(o: Order, reached: ReturnType<typeof statusDates>): { label: string; text: string } {
  if (o.status === "cancelled") return { label: "Cancelled", text: `This order was cancelled${reached.cancelled ? ` on ${day(reached.cancelled)}` : ""}.` };
  if (o.status === "delivered") return { label: "Delivered", text: `Your order was delivered${reached.delivered ? ` on ${day(reached.delivered)}` : ""}. Thank you for shopping with Ŕose Atelier.` };
  if (o.status === "out_for_delivery") return { label: "Out for delivery", text: "The courier has your parcel and is delivering it today." };
  if (o.status === "shipped") return { label: "Shipped", text: o.trackingNumber ? `Your parcel is with the courier. Tracking number ${o.trackingNumber}.` : "Your parcel is with the courier." };
  if (o.eta) return { label: "Expected delivery", text: `${etaLabel(o.eta)}${o.eta.note ? `. ${o.eta.note}` : ""}` };
  if (o.status === "pending") return { label: "Received", text: "We have your order and will confirm it soon, usually by phone or WhatsApp." };
  return { label: "In progress", text: "Your order is being prepared. We will share the expected delivery date soon." };
}

async function OrderDetail({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await getOrderForUser(number, user.id);
  if (!order) notFound();

  const reached = statusDates(order);
  const cancelled = order.status === "cancelled";
  const current = cancelled ? -1 : stepOf(order.status);
  const news = latestNews(order, reached);
  // Under the headline: what this step means, plus the store's note on the delivery date if any.
  const lead =
    cancelled || order.status === "delivered" || order.status === "pending"
      ? news.text
      : `${journey[current].text}${order.eta?.note ? ` ${order.eta.note}.` : ""}`;
  // The current step as a two-part headline ("Being" + italic "Prepared").
  const headline: [string, string] =
    current < 0
      ? ["Order", "Cancelled"]
      : ([
          ["Order", "Received"],
          ["Order", "Confirmed"],
          ["Being", "Prepared"],
          [order.status === "out_for_delivery" ? "Out for" : "On Its", order.status === "out_for_delivery" ? "Delivery" : "Way"],
          ["Delivered,", "Enjoy"],
        ][current] as [string, string]);
  const help = `${whatsappUrl}?text=${encodeURIComponent(`Hello Ŕose Atelier, I have a question about my order #${order.number}.`)}`;
  const country = countries.find((c) => c.code === order.address.country)?.label ?? order.address.country;
  const pairs = order.items.reduce((n, i) => n + i.quantity, 0);
  const [first, ...rest] = order.items;
  const expected = cancelled
    ? "Cancelled"
    : order.status === "delivered"
      ? reached.delivered
        ? `Delivered ${day(reached.delivered)}`
        : "Delivered"
      : order.eta
        ? etaLabel(order.eta)
        : "To be confirmed";

  return (
    <div className="flex flex-col gap-space-md">
      {/* Breadcrumb and status */}
      <div className="flex flex-wrap items-center justify-between gap-space-sm">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-outline min-w-0">
          <Link className="hover:text-primary" href="/account">
            Account
          </Link>
          <span>/</span>
          <Link className="hover:text-primary" href="/account#orders">
            Orders
          </Link>
          <span>/</span>
          <span className="text-primary truncate">#{order.number}</span>
        </nav>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container font-label-uppercase text-[10px] uppercase tracking-[0.16em] text-on-surface-variant">
          <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full ${cancelled ? "bg-error" : order.status === "delivered" ? "bg-secondary" : "bg-secondary motion-safe:animate-pulse"}`} />
          {cancelled ? "Cancelled" : `Step ${current + 1} of ${journey.length} · ${journey[current].title}`}
        </span>
      </div>

      {/* Header: the order and its key facts */}
      <section className={`${card} p-space-md sm:p-space-lg`}>
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-space-md">
          <div className="min-w-0">
            <span className={eyebrow}>Ŕose Atelier · Karachi</span>
            <h1 className="mt-1 font-headline-lg text-[30px] leading-tight sm:text-[40px] text-primary tracking-[-0.02em] font-normal">
              Order <span className="italic text-secondary">Nº</span> {order.number}
            </h1>
            <dl className="mt-space-sm grid grid-cols-2 sm:grid-cols-4 gap-x-space-lg gap-y-space-sm">
              <div>
                <dt className={factLabel}>Ordered by</dt>
                <dd className={factValue}>{order.customer.name}</dd>
              </div>
              <div>
                <dt className={factLabel}>Delivering to</dt>
                <dd className={factValue}>{order.address.city}</dd>
              </div>
              <div>
                <dt className={factLabel}>Placed</dt>
                <dd className={factValue}>{day(order.createdAt)}</dd>
              </div>
              <div>
                <dt className={factLabel}>Expected delivery</dt>
                <dd className={factValue}>{expected}</dd>
              </div>
            </dl>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <a className={btnDark} href={help} rel="noopener noreferrer" target="_blank">
              <span aria-hidden="true" className="material-symbols-outlined text-[16px]">chat</span>
              Need Help?
            </a>
            {order.status === "pending" && <CancelOrderButton number={order.number} />}
          </div>
        </div>
      </section>

      {/* The journey: the current step as the headline, then one progress rail
          (sideways on desktop, a timeline on phones) that fills with gold up to it. */}
      <section className={`${card} overflow-hidden`}>
        <div className="p-space-md sm:p-space-lg flex flex-col md:flex-row md:items-stretch justify-between gap-space-md">
          <div className="min-w-0">
            <span className={eyebrow}>Order Journey</span>
            <h2 className="mt-1 font-headline-lg text-[28px] leading-[1.1] sm:text-[36px] text-primary tracking-[-0.02em] font-normal">
              {cancelled ? (
                <>
                  Order <span className="italic text-error">Cancelled</span>
                </>
              ) : (
                <>
                  {headline[0]} <span className="italic text-secondary">{headline[1]}</span>
                </>
              )}
            </h2>
            <p className="mt-1.5 font-body-md text-[14px] sm:text-[15px] text-on-surface-variant font-light max-w-md">{lead}</p>
          </div>
          {!cancelled && (
            <div className="shrink-0 md:min-w-[220px] flex md:flex-col justify-between md:justify-center gap-2 px-space-md py-space-sm bg-secondary-fixed/50 border-l-2 border-secondary">
              <span className={factLabel}>{order.status === "delivered" ? "Delivered" : "Expected delivery"}</span>
              <span className="font-headline-sm text-[20px] sm:text-[24px] text-primary leading-tight">{expected.replace(/^Delivered /, "")}</span>
              {order.trackingNumber && order.status !== "delivered" && (
                <span className="hidden md:block font-body-sm text-[12px] text-on-surface-variant">
                  Tracking <span className="text-primary select-all">{order.trackingNumber}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* Desktop: the rail */}
        <div className="hidden md:block px-space-lg pb-space-lg pt-space-sm">
          <ol className="relative grid grid-cols-5">
            <span aria-hidden="true" className="absolute top-5 left-[10%] right-[10%] h-px bg-outline-variant/70" />
            <span
              aria-hidden="true"
              className="absolute top-5 left-[10%] h-[2px] -translate-y-[0.5px] bg-gradient-to-r from-primary to-secondary transition-[width] duration-700"
              style={{ width: `${cancelled ? 0 : (Math.max(0, current) / (journey.length - 1)) * 80}%` }}
            />
            {journey.map((j, i) => {
              const done = !cancelled && i < current;
              const now = !cancelled && i === current;
              const at = j.statuses.map((s) => reached[s]).find(Boolean);
              return (
                <li key={j.title} aria-current={now ? "step" : undefined} className="relative flex flex-col items-center text-center px-1">
                  <span className="relative flex items-center justify-center w-10 h-10">
                    {now && order.status !== "delivered" && (
                      <span aria-hidden="true" className="absolute inset-0 rounded-[999px] bg-secondary/25 motion-safe:animate-ping" />
                    )}
                    <span
                      className={`relative z-[1] w-10 h-10 rounded-[999px] flex items-center justify-center ${
                        done
                          ? "bg-primary text-secondary-fixed"
                          : now
                            ? "bg-secondary text-on-secondary ring-4 ring-secondary-fixed"
                            : "bg-surface-container-lowest text-outline ring-1 ring-outline-variant"
                      }`}
                    >
                      <span aria-hidden="true" className="material-symbols-outlined text-[18px]">
                        {done ? "check" : j.icon}
                      </span>
                    </span>
                  </span>
                  <span className={`mt-space-sm font-headline-sm text-[16px] leading-snug ${now ? "text-primary" : done ? "text-primary" : "text-outline"}`}>{j.title}</span>
                  <span className={`font-label-uppercase text-[9px] uppercase tracking-[0.18em] mt-0.5 ${now ? "text-secondary" : "text-outline"}`}>
                    {at && (done || now) ? when(at) : now ? "Now" : "Coming up"}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        {/* Phones: a timeline */}
        <ol className="md:hidden relative mx-space-md mb-space-md pl-12">
          <span aria-hidden="true" className="absolute left-[15px] top-4 bottom-4 w-px bg-outline-variant/70" />
          <span
            aria-hidden="true"
            className="absolute left-[14.5px] top-4 w-[2px] bg-gradient-to-b from-primary to-secondary"
            style={{ height: `calc(${cancelled ? 0 : (Math.max(0, current) / (journey.length - 1)) * 100}% - 2rem)` }}
          />
          {journey.map((j, i) => {
            const done = !cancelled && i < current;
            const now = !cancelled && i === current;
            const at = j.statuses.map((s) => reached[s]).find(Boolean);
            return (
              <li key={j.title} aria-current={now ? "step" : undefined} className="relative py-2.5 min-h-12">
                <span
                  className={`absolute -left-12 top-2 w-8 h-8 rounded-[999px] flex items-center justify-center ${
                    done
                      ? "bg-primary text-secondary-fixed"
                      : now
                        ? "bg-secondary text-on-secondary ring-4 ring-secondary-fixed"
                        : "bg-surface-container-lowest text-outline ring-1 ring-outline-variant"
                  }`}
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px]">
                    {done ? "check" : j.icon}
                  </span>
                </span>
                <div className="flex items-baseline justify-between gap-space-sm">
                  <span className={`font-headline-sm text-[16px] ${done || now ? "text-primary" : "text-outline"}`}>{j.title}</span>
                  <span className={`font-label-uppercase text-[9px] uppercase tracking-[0.16em] whitespace-nowrap ${now ? "text-secondary" : "text-outline"}`}>
                    {at && (done || now) ? when(at) : now ? "Now" : ""}
                  </span>
                </div>
                {now && <p className="font-body-sm text-[12px] text-on-surface-variant">{j.text}</p>}
              </li>
            );
          })}
        </ol>

        {order.trackingNumber && order.status !== "delivered" && !cancelled && (
          <div className="md:hidden mx-space-md mb-space-md px-space-sm py-2 bg-surface-container font-body-sm text-[13px] text-on-surface-variant">
            Courier tracking number: <span className="text-primary font-medium select-all">{order.trackingNumber}</span>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-md items-start">
        {/* The pieces ordered */}
        <section className={`${card} p-space-md sm:p-space-lg`}>
          <div className="flex items-start justify-between gap-space-sm">
            <div className="min-w-0">
              <span className={eyebrow}>
                {pairs} {pairs === 1 ? "Pair" : "Pairs"} Ordered
              </span>
              <h2 className="mt-1 font-headline-sm text-[22px] text-primary font-normal leading-snug">
                <Link className="hover:text-secondary transition-colors" href={`/products/${first.slug}`}>
                  {first.name}
                </Link>
              </h2>
            </div>
            <span className="font-body-md text-[15px] text-primary whitespace-nowrap tabular-nums">
              <Price amount={first.unitPrice * first.quantity} />
            </span>
          </div>
          <div className="relative mt-space-sm aspect-[4/3] bg-surface-container overflow-hidden">
            <Image alt={first.alt} className="object-cover" fill sizes="(min-width: 1024px) 480px, 92vw" src={first.image} />
            {first.sale && (
              <span className="absolute left-2 bottom-2 bg-primary text-secondary-fixed font-label-uppercase text-[9px] uppercase tracking-[0.18em] px-2 py-1">
                {first.sale.name}
              </span>
            )}
          </div>
          <dl className="mt-space-sm grid grid-cols-2 gap-1.5">
            {[
              ["EU Size", String(first.size)],
              ["Quantity", String(first.quantity)],
              ["Price per pair", <Price key="p" amount={first.unitPrice} />],
              ["Discount", first.discountPercent > 0 ? `−${first.discountPercent}%${first.sale ? ` · ${first.sale.name}` : ""}` : "Full price"],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-surface-container-low px-space-sm py-2">
                <dt className={factLabel}>{label}</dt>
                <dd className="font-body-md text-[14px] text-primary">{value}</dd>
              </div>
            ))}
          </dl>

          {rest.length > 0 && (
            <ul className="mt-space-sm divide-y divide-outline-variant/30">
              {rest.map((i) => (
                <li key={`${i.slug}-${i.size}`} className="flex items-center gap-space-sm py-space-sm">
                  <div className="relative w-14 h-16 bg-surface-container overflow-hidden shrink-0">
                    <Image alt={i.alt} className="object-cover" fill sizes="56px" src={i.image} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <Link className="font-headline-sm text-[15px] text-primary hover:text-secondary line-clamp-1" href={`/products/${i.slug}`}>
                      {i.name}
                    </Link>
                    <p className="font-body-sm text-[12px] text-on-surface-variant">
                      EU {i.size} · Qty {i.quantity}
                      {i.discountPercent > 0 && ` · −${i.discountPercent}%`}
                    </p>
                  </div>
                  <span className="font-body-md text-[14px] text-primary whitespace-nowrap tabular-nums">
                    <Price amount={i.unitPrice * i.quantity} />
                  </span>
                </li>
              ))}
            </ul>
          )}

          <dl className="mt-space-sm pt-space-sm border-t border-outline-variant/40 grid grid-cols-[1fr_auto] gap-y-1 font-body-sm text-[13px] text-on-surface-variant">
            {order.coupon && (
              <>
                <dt>Coupon {order.coupon.code}</dt>
                <dd className="text-right text-secondary">
                  {order.coupon.type === "free_delivery" ? (
                    <>
                      Free delivery (saved <Price amount={order.coupon.discount} />)
                    </>
                  ) : (
                    <>
                      −<Price amount={order.coupon.discount} />
                    </>
                  )}
                </dd>
              </>
            )}
            <dt>{order.delivery.name}</dt>
            <dd className="text-right">{order.shippingFee ? <Price amount={order.shippingFee} /> : "Free"}</dd>
            <dt className="font-headline-sm text-[18px] text-primary pt-1">Total</dt>
            <dd className="text-right font-headline-sm text-[18px] text-primary pt-1 tabular-nums">
              <Price amount={order.total} />
            </dd>
          </dl>
        </section>

        <div className="flex flex-col gap-space-md">
          {/* The design's "Journal d'Atelier · Télémétrie en direct" card, holding the delivery details */}
          <section className={`${card} p-space-md sm:p-space-lg`}>
            <div className="flex items-start justify-between gap-space-sm mb-space-md">
              <div>
                <span className={eyebrow}>Delivery Journal</span>
                <h2 className="mt-1 font-headline-sm text-[22px] text-primary font-normal">
                  Your <span className="italic text-secondary">Details</span>
                </h2>
              </div>
              <span className="inline-flex items-center gap-1.5 font-label-uppercase text-[9px] uppercase tracking-[0.16em] text-outline whitespace-nowrap">
                <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-secondary" />
                Saved with this order
              </span>
            </div>
            <ol className="relative flex flex-col gap-space-md pl-space-md before:absolute before:left-[3px] before:top-1.5 before:bottom-1.5 before:w-px before:bg-outline-variant/60">
              {[
                {
                  icon: "person",
                  label: "Recipient",
                  title: order.customer.name,
                  lines: [],
                },
                {
                  icon: "location_on",
                  label: "Delivery address",
                  title: order.address.line1,
                  lines: [order.address.line2, `${order.address.city} ${order.address.postalCode}`.trim(), country].filter(Boolean),
                },
                {
                  icon: "call",
                  label: "Phone and email",
                  title: order.customer.phone,
                  lines: [order.customer.email],
                },
                {
                  icon: "local_shipping",
                  label: "Delivery",
                  title: order.delivery.name,
                  lines: [order.trackingNumber ? `Courier tracking number: ${order.trackingNumber}` : "A tracking number appears here once your parcel is shipped."],
                },
              ].map((row) => (
                <li key={row.label} className="relative">
                  <span aria-hidden="true" className="absolute -left-[calc(var(--spacing-space-md)+0px)] top-1.5 w-[7px] h-[7px] rounded-full bg-secondary ring-4 ring-surface-container-lowest" />
                  <span className="flex items-center gap-1 font-label-uppercase text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-outline">
                    <span aria-hidden="true" className="material-symbols-outlined text-[13px] text-secondary">
                      {row.icon}
                    </span>
                    {row.label}
                  </span>
                  <p className="font-body-md text-[15px] font-medium text-primary break-words">{row.title}</p>
                  {row.lines.map((l) => (
                    <p key={l} className="font-body-sm text-[13px] text-on-surface-variant break-words select-all">
                      {l}
                    </p>
                  ))}
                </li>
              ))}
            </ol>
          </section>

          <div className="grid grid-cols-2 gap-space-md">
            <section className={`${card} p-space-md flex items-start gap-space-sm`}>
              <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[20px]">
                payments
              </span>
              <div className="min-w-0">
                <span className={factLabel}>Payment</span>
                <p className="font-body-md text-[14px] text-primary">{paymentMethodLabel(order.payment.method)}</p>
                <p className="font-body-sm text-[12px] text-on-surface-variant">{paymentStatusLabel[order.payment.status]}</p>
              </div>
            </section>
            <section className={`${card} p-space-md flex items-start gap-space-sm`}>
              <span aria-hidden="true" className="material-symbols-outlined text-secondary text-[20px]">
                event
              </span>
              <div className="min-w-0">
                <span className={factLabel}>Expected delivery</span>
                <p className="font-body-md text-[14px] text-primary">{expected}</p>
                {order.eta?.note && !cancelled && order.status !== "delivered" && <p className="font-body-sm text-[12px] text-on-surface-variant">{order.eta.note}</p>}
              </div>
            </section>
          </div>
        </div>
      </div>

      {/* Help, like the design's private concierge card */}
      <section className={`${card} p-space-md sm:p-space-lg flex flex-col md:flex-row md:items-center justify-between gap-space-md`}>
        <div>
          <span className={eyebrow}>Customer Care</span>
          <h2 className="mt-1 font-headline-sm text-[22px] text-primary font-normal">
            Questions About <span className="italic text-secondary">This Order?</span>
          </h2>
          <p className="font-body-sm text-[13px] text-on-surface-variant max-w-md">
            Message us on WhatsApp with your order number, #{order.number}, and we will help with sizes, delivery or anything else.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a className={btnDark} href={help} rel="noopener noreferrer" target="_blank">
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">chat</span>
            WhatsApp Us
          </a>
          <Link className={btnLight} href="/collections">
            Continue Shopping
            <span aria-hidden="true" className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>
      </section>
    </div>
  );
}

export default function OrderPage(props: PageProps<"/account/orders/[number]">) {
  return (
    <section className="w-full max-w-[1100px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <Suspense fallback={<div className="h-64 bg-surface-container motion-safe:animate-pulse" />}>
        <OrderDetail {...props} />
      </Suspense>
    </section>
  );
}
