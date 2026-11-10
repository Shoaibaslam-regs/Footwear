import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import MyCoupons from "@/components/offers/MyCoupons";
import { logout } from "@/lib/auth/actions";
import { fulfilmentSteps, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders";
import { listOrdersForUser } from "@/lib/server/orders";
import Price from "@/components/Price";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata: Metadata = {
  title: "My Account — Ŕose Atelier",
};

const card = "bg-surface-container-lowest rounded-xl shadow-sm p-space-lg flex flex-col gap-space-sm";

async function AccountDetails({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const [{ denied, reset }, orders] = await Promise.all([searchParams, listOrdersForUser(user.id)]);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-space-md mb-space-lg">
        <div>
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
            My Account
          </span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight mt-1">
            Welcome, {user.name.split(" ")[0]}
          </h1>
        </div>
        <form action={logout}>
          <ConfirmButton
            className="h-11 px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors"
            confirm={{
              title: "Log out of your account?",
              message: "Your bag and wishlist stay saved in your account.",
              confirmLabel: "Log Out",
              cancelLabel: "Stay Logged In",
              icon: "logout",
            }}
          >
            Log Out
          </ConfirmButton>
        </form>
      </div>

      {reset === "1" && (
        <p className="mb-space-md font-body-sm text-body-sm bg-secondary-fixed/40 text-primary rounded-lg px-space-md py-space-sm" role="status">
          Your password has been changed. You have been logged out on your other devices.
        </p>
      )}
      {denied === "admin" && (
        <p className="mb-space-md font-body-sm text-body-sm bg-error-container text-on-error-container rounded-lg px-space-md py-space-sm" role="alert">
          Only Ŕose Atelier admins can open the admin panel.
        </p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
        <div className={card}>
          <span className="font-label-uppercase text-label-uppercase text-outline uppercase tracking-wider">
            Profile
          </span>
          <p className="font-headline-sm text-headline-sm text-primary">{user.name}</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">{user.email}</p>
          <p className="font-label-sm text-label-sm text-secondary uppercase tracking-wider">
            {user.role === "admin" ? "Admin" : "Customer"}
          </p>
        </div>
        <Link className={`${card} hover:shadow-xl transition-shadow`} href="/wishlist">
          <span className="material-symbols-outlined text-secondary">favorite</span>
          <p className="font-headline-sm text-headline-sm text-primary">Wishlist</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Items you have saved.</p>
        </Link>
        {user.role === "admin" ? (
          <Link className={`${card} hover:shadow-xl transition-shadow`} href="/admin">
            <span className="material-symbols-outlined text-secondary">dashboard</span>
            <p className="font-headline-sm text-headline-sm text-primary">Admin Panel</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Manage products, orders and customers.</p>
          </Link>
        ) : (
          <Link className={`${card} hover:shadow-xl transition-shadow`} href="/cart">
            <span className="material-symbols-outlined text-secondary">shopping_bag</span>
            <p className="font-headline-sm text-headline-sm text-primary">Shopping Bag</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">See your bag and check out.</p>
          </Link>
        )}
      </div>

      <MyCoupons userId={user.id} />

      <div className="mt-space-xl">
        <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
          Order History
        </span>
        <h2 className="font-headline-md text-headline-md text-primary mt-1 mb-space-md">Your Orders</h2>
        {orders.length === 0 ? (
          <p className="font-body-md text-body-md text-on-surface-variant">
            No orders yet.{" "}
            <Link className="text-primary underline underline-offset-4 decoration-secondary" href="/collections">
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-space-md">
            {orders.map((o) => {
              const stepIndex = fulfilmentSteps.indexOf(o.status);
              return (
                <li key={o.id} className={`${card} gap-space-md`}>
                  <div className="flex flex-wrap items-baseline justify-between gap-space-sm">
                    <div>
                      <Link className="font-headline-sm text-headline-sm text-primary hover:text-secondary inline-flex items-center gap-1" href={`/account/orders/${o.number}`}>
                        #{o.number}
                        <span aria-hidden="true" className="material-symbols-outlined text-[0.85em] text-secondary">arrow_outward</span>
                      </Link>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {new Date(o.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Karachi" })}
                        {" · "}
                        {o.items.reduce((n, i) => n + i.quantity, 0)} pieces · {paymentMethodLabel(o.payment.method)} ({paymentStatusLabel[o.payment.status].toLowerCase()})
                      </p>
                    </div>
                    <span className="font-headline-sm text-headline-sm text-primary">
                      <Price amount={o.total} />
                    </span>
                  </div>

                  {o.status === "cancelled" ? (
                    <p className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-error">
                      Cancelled
                    </p>
                  ) : (
                    <ol aria-label="Order progress" className="grid grid-cols-3 sm:grid-cols-6 gap-1">
                      {fulfilmentSteps.map((s, i) => (
                        <li key={s} aria-current={i === stepIndex ? "step" : undefined} className="flex flex-col gap-1">
                          <span className={`h-1 rounded-full ${i <= stepIndex ? "bg-secondary" : "bg-surface-container-high"}`} />
                          <span className={`font-label-uppercase text-[10px] uppercase tracking-wider ${i <= stepIndex ? "text-primary" : "text-outline"}`}>
                            {orderStatusLabel[s]}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                  {o.trackingNumber && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant">
                      Courier tracking: <strong className="text-primary">{o.trackingNumber}</strong>
                    </p>
                  )}
                  <p className="font-body-sm text-body-sm text-on-surface-variant">
                    {o.items.map((i) => `${i.name} (EU ${i.size}) ×${i.quantity}`).join(", ")}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}

export default function AccountPage(props: PageProps<"/account">) {
  return (
    <section className="w-full max-w-[1536px] mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <Suspense
        fallback={<div className="h-40 rounded-xl bg-surface-container motion-safe:animate-pulse" />}
      >
        <AccountDetails {...props} />
      </Suspense>
    </section>
  );
}
