import { ObjectId } from "mongodb";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireUser } from "@/lib/auth/dal";
import MyCoupons from "@/components/offers/MyCoupons";
import { carts } from "@/lib/server/carts";
import { logout } from "@/lib/auth/actions";
import { etaLabel, fulfilmentSteps, orderStatusLabel, paymentMethodLabel, paymentStatusLabel } from "@/lib/orders";
import { listOrdersForUser } from "@/lib/server/orders";
import Price from "@/components/Price";
import ConfirmButton from "@/components/ConfirmButton";

export const metadata: Metadata = {
  title: "Account — Ŕose Atelier",
};

const card = "bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-col gap-space-sm";
const eyebrow = "font-label-uppercase text-[10px] sm:text-label-uppercase text-secondary uppercase tracking-[0.2em]";
const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "Asia/Karachi" });

async function AccountDetails({ searchParams }: PageProps<"/account">) {
  const user = await requireUser("/account");
  const [{ denied, reset }, orders, cart] = await Promise.all([
    searchParams,
    listOrdersForUser(user.id),
    (await carts()).findOne({ _id: new ObjectId(user.id) }, { projection: { bag: 1, wishlist: 1 } }),
  ]);
  const bagPairs = (cart?.bag ?? []).reduce((n, l) => n + l.quantity, 0);
  const saved = cart?.wishlist?.length ?? 0;

  return (
    <>
      <div className="flex flex-row items-end justify-between gap-space-sm mb-space-md sm:mb-space-lg">
        <div className="min-w-0">
          <span className={eyebrow}>Account</span>
          <h1 className="font-headline-sm text-[26px] leading-tight sm:font-headline-lg-mobile sm:text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight mt-1 truncate">
            Welcome, {user.name.split(" ")[0]}
          </h1>
        </div>
        <form action={logout} className="shrink-0">
          <ConfirmButton
            className="h-9 sm:h-11 px-space-md sm:px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-widest transition-colors"
            confirm={{
              title: "Log out?",
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
        <p className="mb-space-md font-body-sm text-[12px] sm:text-body-sm bg-secondary-fixed/40 text-primary rounded-lg px-space-md py-space-sm" role="status">
          Your password has been changed. You have been logged out on your other devices.
        </p>
      )}
      {denied === "admin" && (
        <p className="mb-space-md font-body-sm text-[12px] sm:text-body-sm bg-error-container text-on-error-container rounded-lg px-space-md py-space-sm" role="alert">
          Only Ŕose Atelier admins can open the admin panel.
        </p>
      )}

      {/* Phones: profile as one row, then two small tiles. md+: three cards. */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-space-sm sm:gap-gutter">
        <div className="bg-surface-container-lowest rounded-xl shadow-sm p-space-md sm:p-space-lg flex flex-row md:flex-col gap-space-sm col-span-2 md:col-span-1 items-center md:items-start">
          <span aria-hidden="true" className="md:hidden shrink-0 w-11 h-11 rounded-full bg-primary text-secondary-fixed flex items-center justify-center font-headline-sm text-[20px]">
            {user.name.trim().charAt(0).toUpperCase()}
          </span>
          <span className="hidden md:block font-label-uppercase text-label-uppercase text-outline uppercase tracking-wider">Profile</span>
          <div className="min-w-0 flex-1">
            <p className="font-headline-sm text-[17px] sm:text-headline-sm text-primary truncate">{user.name}</p>
            <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant truncate">{user.email}</p>
          </div>
          <p className="font-label-sm text-[10px] sm:text-label-sm text-secondary uppercase tracking-wider shrink-0">
            {user.role === "admin" ? "Admin" : "Customer"}
          </p>
        </div>
        <Link className={`${card} hover:shadow-xl transition-shadow`} href="/wishlist">
          <span className="material-symbols-outlined text-secondary text-[20px] sm:text-[24px]">favorite</span>
          <div>
            <p className="font-headline-sm text-[16px] sm:text-headline-sm text-primary">Wishlist</p>
            <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant">
              {saved ? `${saved} saved` : "Nothing saved yet"}
            </p>
          </div>
        </Link>
        {user.role === "admin" ? (
          <Link className={`${card} hover:shadow-xl transition-shadow`} href="/admin">
            <span className="material-symbols-outlined text-secondary text-[20px] sm:text-[24px]">dashboard</span>
            <div>
              <p className="font-headline-sm text-[16px] sm:text-headline-sm text-primary">Admin Panel</p>
              <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant">Manage the store.</p>
            </div>
          </Link>
        ) : (
          <Link className={`${card} hover:shadow-xl transition-shadow`} href="/cart">
            <span className="material-symbols-outlined text-secondary text-[20px] sm:text-[24px]">shopping_bag</span>
            <div>
              <p className="font-headline-sm text-[16px] sm:text-headline-sm text-primary">Shopping Bag</p>
              <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant">
                {bagPairs ? `${bagPairs} ${bagPairs === 1 ? "pair" : "pairs"}` : "Bag is empty"}
              </p>
            </div>
          </Link>
        )}
      </div>

      {/* Streams in on its own, so the rest of the page doesn't wait for the coupon checks. */}
      <Suspense>
        <MyCoupons userId={user.id} />
      </Suspense>

      <div className="mt-space-lg sm:mt-space-xl">
        <span className={eyebrow}>Order History</span>
        <h2 className="font-headline-sm text-[24px] sm:font-headline-md sm:text-headline-md text-primary mt-1 mb-space-sm sm:mb-space-md">Orders</h2>
        {orders.length === 0 ? (
          <p className="font-body-sm text-body-sm sm:font-body-md sm:text-body-md text-on-surface-variant">
            No orders yet.{" "}
            <Link className="text-primary underline underline-offset-4 decoration-secondary" href="/collections">
              Start shopping
            </Link>
            .
          </p>
        ) : (
          <ul className="flex flex-col gap-space-sm sm:gap-space-md">
            {orders.map((o) => {
              const stepIndex = fulfilmentSteps.indexOf(o.status);
              const pairs = o.items.reduce((n, i) => n + i.quantity, 0);
              return (
                <li key={o.id} className={`${card} sm:gap-space-md`}>
                  <div className="flex items-start justify-between gap-space-sm">
                    <div className="min-w-0">
                      <Link
                        className="font-headline-sm text-[17px] sm:text-headline-sm text-primary hover:text-secondary inline-flex items-center gap-1"
                        href={`/account/orders/${o.number}`}
                      >
                        #{o.number}
                        <span aria-hidden="true" className="material-symbols-outlined text-[0.85em] text-secondary">
                          arrow_outward
                        </span>
                      </Link>
                      <p className="font-body-sm text-[12px] leading-snug sm:text-body-sm text-on-surface-variant">
                        {shortDate(o.createdAt)} · {pairs} {pairs === 1 ? "pair" : "pairs"} · {paymentMethodLabel(o.payment.method)} ·{" "}
                        {paymentStatusLabel[o.payment.status].toLowerCase()}
                      </p>
                    </div>
                    <span className="font-headline-sm text-[17px] sm:text-headline-sm text-primary whitespace-nowrap">
                      <Price amount={o.total} />
                    </span>
                  </div>

                  {o.status === "cancelled" ? (
                    <p className="font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-wider text-error">Cancelled</p>
                  ) : (
                    <div>
                      {/* Phones: one slim six-part bar and the current step in words. */}
                      <p className="sm:hidden mb-1.5 font-label-uppercase text-[10px] uppercase tracking-wider text-on-surface-variant">
                        <span className="text-primary font-semibold">{orderStatusLabel[o.status]}</span> · step {stepIndex + 1} of {fulfilmentSteps.length}
                      </p>
                      <ol aria-label="Order progress" className="grid grid-cols-6 gap-1">
                        {fulfilmentSteps.map((s, i) => (
                          <li key={s} aria-current={i === stepIndex ? "step" : undefined} className="flex flex-col gap-1">
                            <span className={`h-1 rounded-full ${i <= stepIndex ? "bg-secondary" : "bg-surface-container-high"}`} />
                            <span className={`hidden sm:block font-label-uppercase text-[10px] uppercase tracking-wider ${i <= stepIndex ? "text-primary" : "text-outline"}`}>
                              {orderStatusLabel[s]}
                            </span>
                            <span className="sr-only sm:hidden">{orderStatusLabel[s]}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {o.eta && o.status !== "delivered" && o.status !== "cancelled" && (
                    <p className="flex items-center gap-1 font-body-sm text-[12px] sm:text-body-sm text-primary">
                      <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">local_shipping</span>
                      Arrives <strong className="font-semibold">{etaLabel(o.eta)}</strong>
                    </p>
                  )}
                  {o.trackingNumber && (
                    <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant">
                      Courier tracking: <strong className="text-primary">{o.trackingNumber}</strong>
                    </p>
                  )}
                  <p className="font-body-sm text-[12px] sm:text-body-sm text-on-surface-variant line-clamp-2">
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
