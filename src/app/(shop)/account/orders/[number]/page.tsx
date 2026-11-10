import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import { countries } from "@/lib/checkout-data";
import { whatsappUrl } from "@/lib/data";
import { fulfilmentSteps, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders";
import { getOrderForUser, statusDates } from "@/lib/server/orders";
import Price from "@/components/Price";
import CancelOrderButton from "@/components/account/CancelOrderButton";

export const metadata: Metadata = { title: "My Order — Ŕose Atelier", robots: { index: false } };

const date = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Karachi" });
const card = "bg-surface-container-lowest rounded-xl shadow-sm p-space-lg";

async function OrderDetail({ params }: PageProps<"/account/orders/[number]">) {
  const { number } = await params;
  const user = await requireUser(`/account/orders/${number}`);
  const order = await getOrderForUser(number, user.id);
  if (!order) notFound();
  const reached = statusDates(order);
  const stepIndex = fulfilmentSteps.indexOf(order.status);
  const help = `${whatsappUrl}?text=${encodeURIComponent(`Hello Ŕose Atelier, I have a question about my order #${order.number}.`)}`;
  const country = countries.find((c) => c.code === order.address.country)?.label ?? order.address.country;

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md mb-space-lg">
        <div>
          <Link className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-on-surface-variant hover:text-primary" href="/account">
            ← My Account
          </Link>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight mt-1">
            Order #{order.number}
          </h1>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Placed {date(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-space-sm">
          {order.status === "pending" && <CancelOrderButton number={order.number} />}
          <a
            className="h-11 px-space-lg rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center gap-2 transition-colors"
            href={help}
            rel="noopener noreferrer"
            target="_blank"
          >
            <span className="material-symbols-outlined text-[18px]">chat</span> Need Help?
          </a>
        </div>
      </div>

      <section className={`${card} mb-space-md`}>
        <h2 className="font-headline-sm text-headline-sm text-primary mb-space-md">Progress</h2>
        {order.status === "cancelled" ? (
          <p className="font-body-md text-body-md text-error">
            This order was cancelled{reached.cancelled ? ` on ${date(reached.cancelled)}` : ""}.
          </p>
        ) : (
          <ol className="grid grid-cols-1 sm:grid-cols-6 gap-space-sm">
            {fulfilmentSteps.map((s, i) => {
              const done = i <= stepIndex;
              return (
                <li key={s} aria-current={i === stepIndex ? "step" : undefined} className="flex sm:flex-col items-center sm:items-start gap-space-sm">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${done ? "bg-secondary text-on-secondary" : "bg-surface-container text-outline"}`}>
                    <span className="material-symbols-outlined text-[16px]">{done ? "check" : "radio_button_unchecked"}</span>
                  </span>
                  <span>
                    <span className={`block font-label-uppercase text-[11px] uppercase tracking-wider ${done ? "text-primary" : "text-outline"}`}>
                      {orderStatusLabel[s]}
                    </span>
                    {reached[s] && done && <span className="block font-body-sm text-xs text-on-surface-variant">{date(reached[s]!)}</span>}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        {order.trackingNumber && (
          <p className="mt-space-md p-space-sm bg-surface-container-low rounded-lg font-body-md text-body-md text-on-surface">
            Courier tracking number: <strong className="text-primary select-all">{order.trackingNumber}</strong>
          </p>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-md">
        <section className={`${card} lg:col-span-2`}>
          <h2 className="font-headline-sm text-headline-sm text-primary mb-space-sm">Items</h2>
          <ul>
            {order.items.map((i) => (
              <li key={`${i.slug}-${i.size}`} className="flex items-center gap-space-md py-space-sm border-b border-surface-container-high last:border-b-0">
                <div className="relative w-16 h-20 rounded overflow-hidden bg-surface-container shrink-0">
                  <Image alt={i.alt} className="object-cover" fill sizes="64px" src={i.image} />
                </div>
                <div className="flex-1 min-w-0">
                  <Link className="font-body-md text-body-md text-primary font-medium hover:text-secondary" href={`/products/${i.slug}`}>
                    {i.name}
                  </Link>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    EU {i.size} · Qty {i.quantity}
                  </p>
                </div>
                <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                  <Price amount={i.unitPrice * i.quantity} />
                </span>
              </li>
            ))}
          </ul>
          <dl className="mt-space-sm grid grid-cols-[1fr_auto] gap-y-1 font-body-sm text-body-sm text-on-surface-variant">
            {order.discountTotal > 0 && (
              <>
                <dt>Discount</dt>
                <dd className="text-right text-error">
                  −<Price amount={order.discountTotal} />
                </dd>
              </>
            )}
            {order.coupon && (
              <>
                <dt>Coupon {order.coupon.code}</dt>
                <dd className="text-right text-secondary">
                  {order.coupon.type === "free_delivery" ? (
                    <>Free delivery (saved <Price amount={order.coupon.discount} />)</>
                  ) : (
                    <>−<Price amount={order.coupon.discount} /></>
                  )}
                </dd>
              </>
            )}
            <dt>{order.delivery.name}</dt>
            <dd className="text-right">{order.shippingFee ? <Price amount={order.shippingFee} /> : "Free"}</dd>
            <dt className="font-headline-sm text-headline-sm text-primary pt-space-xs">Total</dt>
            <dd className="text-right font-headline-sm text-headline-sm text-primary pt-space-xs">
              <Price amount={order.total} />
            </dd>
          </dl>
        </section>

        <section className={`${card} flex flex-col gap-space-md`}>
          <div>
            <h2 className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary mb-1">Payment</h2>
            <p className="font-body-md text-body-md text-primary">{paymentMethodLabel(order.payment.method)}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">{paymentStatusLabel[order.payment.status]}</p>
          </div>
          <div>
            <h2 className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-secondary mb-1">Delivering to</h2>
            <address className="not-italic font-body-sm text-body-sm text-on-surface">
              {order.customer.name}
              <br />
              {order.address.line1}
              {order.address.line2 && `, ${order.address.line2}`}
              <br />
              {order.address.city} {order.address.postalCode}, {country}
              <br />
              {order.customer.phone}
            </address>
          </div>
        </section>
      </div>
    </>
  );
}

export default function OrderPage(props: PageProps<"/account/orders/[number]">) {
  return (
    <section className="w-full max-w-[1100px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <Suspense fallback={<div className="h-64 rounded-xl bg-surface-container motion-safe:animate-pulse" />}>
        <OrderDetail {...props} />
      </Suspense>
    </section>
  );
}
