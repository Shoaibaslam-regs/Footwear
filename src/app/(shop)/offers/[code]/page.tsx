import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { io } from "next/cache";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { couponConditions, couponHeadline, dayMonth, normaliseCode, priceWithCoupon, type CouponTerms } from "@/lib/coupons";
import { categoryLabel, productHref, salePrice, type Listing } from "@/lib/products";
import { cardFor, getCouponByCode, isRevealed, toTerms, unavailableReason } from "@/lib/server/coupons";
import { getPublishedProducts } from "@/lib/server/products";
import { getOnlineSales } from "@/lib/server/sales";
import { whatsappUrl } from "@/lib/data";
import Price from "@/components/Price";
import ScratchCard from "@/components/offers/ScratchCard";
import { RevealProvider, WhenRevealed } from "@/components/offers/Reveal";

export const metadata: Metadata = { title: "Your Coupon — Ŕose Atelier", robots: { index: false } };

const label = "font-label-uppercase text-label-uppercase";

/** Up to 3 shoes the coupon works on: best sellers first, then newest. */
function pickShoes(all: Listing[], t: CouponTerms, sold: Record<string, number>) {
  const ok = all.filter((p) => (!t.fullPriceOnly || p.discountPercent === 0) && (!t.minOrder || salePrice(p) >= t.minOrder));
  const pool = ok.length >= 3 ? ok : all;
  return [...pool]
    .sort((a, b) => Number(b.bestSeller) - Number(a.bestSeller) || (sold[b.slug] ?? 0) - (sold[a.slug] ?? 0) || b.createdAt.localeCompare(a.createdAt))
    .slice(0, 3);
}

async function Offer({ params }: PageProps<"/offers/[code]">) {
  // Personal to each visitor (it can create their surprise card) and time-dependent:
  // never part of a prerender. io() resolves at once for a real request.
  await io();
  const { code: raw } = await params;
  const code = normaliseCode(decodeURIComponent(raw));
  const [user, found] = await Promise.all([getCurrentUser(), getCouponByCode(code)]);
  const first = user?.name.split(" ")[0] ?? null;

  // A surprise campaign: every customer gets their own card (random code and percent), made on first visit.
  let coupon = found;
  let notAvailable: string | null = null;
  if (found?.type === "random") {
    if (!user) {
      return (
        <div className="text-center max-w-xl mx-auto py-space-xl flex flex-col items-center gap-space-md">
          <span className="w-16 h-16 rounded-full bg-primary text-secondary-fixed flex items-center justify-center shadow-lg">
            <span className="material-symbols-outlined icon-filled text-[30px]">redeem</span>
          </span>
          <span className={`${label} tracking-[0.28em] text-secondary`}>A Surprise Is Waiting</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile md:font-headline-lg md:text-headline-lg text-primary font-normal">Get Your Surprise Card</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Log in or create a free account to get your own scratch card. Scratch it to see your discount.
          </p>
          <Link
            className={`${label} px-space-lg py-3.5 rounded-full bg-primary text-on-primary hover:bg-secondary transition-colors`}
            href={`/login?next=${encodeURIComponent(`/offers/${code}`)}`}
          >
            Log In to Get My Card
          </Link>
          <Link className="font-body-sm text-body-sm text-on-surface-variant underline underline-offset-4" href={`/register?next=${encodeURIComponent(`/offers/${code}`)}`}>
            New here? Create a free account
          </Link>
        </div>
      );
    }
    if (user.role === "admin") {
      return (
        <div className="text-center max-w-xl mx-auto py-space-xl flex flex-col items-center gap-space-md">
          <span className="material-symbols-outlined text-secondary text-[40px]">redeem</span>
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-normal">Surprise card preview</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            Each customer who opens this link gets their own code and a random discount between {found.minPercent ?? 10}% and {found.maxPercent ?? 60}%. Admin
            accounts don&apos;t get cards, so none of your cards are used up. Log in as a customer to try it.
          </p>
          <Link className={`${label} px-space-lg py-3.5 rounded-full bg-primary text-on-primary hover:bg-secondary transition-colors`} href="/admin/coupons">
            Back to Coupons
          </Link>
        </div>
      );
    }
    const got = await cardFor(found, user.id);
    if ("error" in got) notAvailable = got.error;
    else coupon = got.card;
  }
  const why = notAvailable ?? (await unavailableReason(coupon, user?.id ?? null));

  if (why || !coupon) {
    return (
      <div className="text-center max-w-xl mx-auto py-space-xl flex flex-col items-center gap-space-md">
        <span className="material-symbols-outlined text-secondary text-[40px]">sell</span>
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary font-normal">This offer is not available</h1>
        <p className="font-body-md text-body-md text-on-surface-variant">{why ?? "This code is not valid."} Ask us on WhatsApp about current offers.</p>
        <div className="flex flex-wrap justify-center gap-space-sm">
          <Link className={`${label} px-space-lg py-3.5 rounded-full bg-primary text-on-primary hover:bg-secondary transition-colors`} href="/collections">
            Shop Now
          </Link>
          <a className={`${label} px-space-lg py-3.5 rounded-full bg-surface-container-highest text-primary hover:bg-secondary-container transition-colors`} href={whatsappUrl} rel="noopener noreferrer" target="_blank">
            WhatsApp Us
          </a>
        </div>
      </div>
    );
  }

  const t = toTerms(coupon);
  const surprise = !!coupon.campaignId;
  const revealedBefore = user ? await isRevealed(coupon, user.id) : false;
  const headline = couponHeadline(t);
  const conditions = couponConditions(t);
  const validUntil = t.endsAt ? dayMonth(t.endsAt) : null;
  const [all, sold] = await Promise.all([getPublishedProducts(), getOnlineSales()]);
  const shoes = pickShoes(all, t, sold);
  // Shares the campaign link (each friend gets their own card), never the code or the discount.
  const shareText = surprise
    ? `A surprise discount is waiting for you at Ŕose Atelier. Scratch your card: /offers/${code}`
    : `You have a special offer at Ŕose Atelier. Scratch your card to see it: /offers/${t.code}`;

  return (
    <RevealProvider initial={revealedBefore}>
      {/* Breadcrumb & who it's for */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-xs pb-space-md">
        <nav aria-label="Breadcrumb" className={`flex items-center gap-space-xs text-on-surface-variant ${label}`}>
          <Link className="text-secondary font-semibold hover:text-primary" href="/">
            HOME
          </Link>
          <span>/</span>
          <span>OFFERS</span>
          <span>/</span>
          <span className="text-primary font-bold">YOUR COUPON</span>
        </nav>
        {user ? (
          <div className="flex items-center gap-space-sm bg-surface-container-lowest px-space-md py-1.5 rounded-full shadow-sm self-start">
            <span className="w-2 h-2 rounded-full bg-secondary motion-safe:animate-pulse" />
            <span className={`${label} text-on-surface`}>FOR: {user.name.toUpperCase()}</span>
          </div>
        ) : (
          <Link
            className="flex items-center gap-space-sm bg-surface-container-lowest px-space-md py-1.5 rounded-full shadow-sm self-start hover:shadow-md transition-shadow"
            href={`/login?next=${encodeURIComponent(`/offers/${t.code}`)}`}
          >
            <span className="w-2 h-2 rounded-full bg-secondary motion-safe:animate-pulse" />
            <span className={`${label} text-on-surface`}>LOG IN TO USE THIS COUPON</span>
          </Link>
        )}
      </div>

      <ScratchCard
        code={t.code}
        conditions={conditions.join(" · ")}
        greetingName={first}
        headline={headline}
        shareText={shareText}
        surprise={surprise}
        usesNote={conditions[conditions.length - 1].toUpperCase()}
        validUntil={validUntil}
      />

      {/* How to use it */}
      <div className="mt-space-xl mb-space-xl">
        <div className="text-center max-w-xl mx-auto mb-space-lg">
          <span className={`${label} tracking-[0.24em] text-secondary uppercase block mb-space-xs`}>How It Works</span>
          <h2 className="font-headline-md text-headline-md text-primary font-normal">How to Use Your Coupon</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
          {[
            {
              n: "01",
              title: "Choose Your Shoes",
              text: "Add the shoes you love to your bag. Pick your size, or ask us on WhatsApp if you are not sure.",
              foot: "STEP 1 • SHOP",
              tone: "bg-surface-container-highest text-primary",
            },
            {
              n: "02",
              title: "Apply Your Code",
              text: "Tap Apply to Bag on the card above, or type your code at checkout. You will see the saving before you pay.",
              foot: "STEP 2 • SAVE",
              tone: "bg-secondary-container text-on-secondary-fixed",
            },
            {
              n: "03",
              title: "Place Your Order",
              text: "Pay by Cash on Delivery, EasyPaisa, JazzCash, bank transfer or a card payment link. We deliver across Pakistan.",
              foot: "STEP 3 • RELAX",
              tone: "bg-surface-container-highest text-primary",
            },
          ].map((s) => (
            <div key={s.n} className="p-space-lg rounded-xl bg-surface-container-low transition-all hover:bg-surface-container-lowest hover:shadow-md flex flex-col justify-between">
              <div>
                <div className={`w-12 h-12 rounded-full ${s.tone} flex items-center justify-center font-headline-sm text-headline-sm mb-space-md`}>{s.n}</div>
                <h3 className="font-headline-sm text-headline-sm text-primary mb-space-xs font-normal">{s.title}</h3>
                <p className="font-body-md text-body-md text-on-surface-variant">{s.text}</p>
              </div>
              <div className="mt-space-md pt-space-sm font-label-uppercase text-[11px] text-secondary tracking-widest">{s.foot}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Shoes it works on */}
      {shoes.length > 0 && (
        <div className="my-space-xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-space-lg gap-space-xs">
            <div>
              <span className={`${label} tracking-[0.24em] text-secondary uppercase block mb-space-xs`}>{first ? `Picked for ${first}` : "Picked for You"}</span>
              <h2 className="font-headline-md text-headline-md text-primary font-normal">Shoes You Can Use It On</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant max-w-md">
              <WhenRevealed
                after={
                  t.type === "free_delivery"
                    ? "Free delivery on these and every other style in the shop."
                    : `The price in bold is what you pay with this coupon${t.minOrder ? " (when your order is over the minimum)" : ""}.`
                }
                before="Scratch the card above to see your price on each pair."
              />
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-gutter">
            {shoes.map((p, i) => {
              const now = salePrice(p);
              const withCoupon = priceWithCoupon(t, now, p.discountPercent);
              return (
                <div key={p.slug} className="group bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-surface-container-low">
                    <Image
                      alt={p.alt}
                      className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
                      fill
                      priority={i === 0}
                      sizes="(min-width: 768px) 30vw, (min-width: 640px) 50vw, 100vw"
                      src={p.image}
                    />
                    {p.spec && (
                      <div className="absolute top-4 left-4">
                        <span className="px-2.5 py-1 rounded-full bg-surface-container-lowest/90 backdrop-blur text-primary font-label-uppercase text-[10px] tracking-wider shadow-sm uppercase">
                          {p.spec}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="p-space-md space-y-space-xs flex-1 flex flex-col justify-between">
                    <div>
                      <span className="font-label-uppercase text-[10px] tracking-widest text-secondary block uppercase">{p.material}</span>
                      <h3 className="font-headline-sm text-headline-sm text-primary font-normal">{p.name}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 mt-1">
                        {p.description || `${categoryLabel(p.category)}, handmade in Karachi.`}
                      </p>
                    </div>
                    <div className="pt-space-sm flex items-center justify-between">
                      <div>
                        <WhenRevealed
                          before={
                            <span className="font-headline-sm text-headline-sm text-primary font-semibold">
                              <Price amount={now} />
                            </span>
                          }
                          after={withCoupon !== null && withCoupon < now ? (
                          <>
                            <span className="font-body-sm text-body-sm text-outline line-through block">
                              <Price amount={now} />
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-headline-sm text-headline-sm text-primary font-semibold">
                                <Price amount={withCoupon} />
                              </span>
                              <span className="font-label-uppercase text-[10px] text-secondary font-semibold bg-secondary-container/50 px-1.5 py-0.5 rounded whitespace-nowrap">WITH COUPON</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="font-headline-sm text-headline-sm text-primary font-semibold">
                              <Price amount={now} />
                            </span>
                            <span className="font-label-uppercase text-[10px] text-secondary font-semibold bg-secondary-container/50 px-1.5 py-0.5 rounded whitespace-nowrap">
                              {t.type === "free_delivery" ? "FREE DELIVERY" : "ON SALE"}
                            </span>
                          </div>
                        )}
                        />
                      </div>
                      <Link
                        aria-label={`View ${p.name}`}
                        className="w-10 h-10 rounded-full bg-primary text-on-primary flex items-center justify-center hover:bg-secondary transition-colors"
                        href={productHref(p)}
                        title="View product"
                      >
                        <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Help desk */}
      <div className="my-space-xl p-6 lg:p-10 rounded-xl bg-surface-container-low shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-center">
          <div className="lg:col-span-5 flex items-center gap-space-md">
            <div className="w-24 h-24 rounded-full bg-surface-container-highest shrink-0 shadow-md flex items-center justify-center">
              <span className="material-symbols-outlined text-secondary text-[40px]">support_agent</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-primary font-normal">Ŕose Atelier Help</span>
                <span className="material-symbols-outlined text-secondary text-[18px]">verified</span>
              </div>
              <span className={`${label} text-secondary tracking-widest block`}>Customer Help • Karachi</span>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                &ldquo;Questions about your coupon, sizes or delivery? Message us and we will help you choose.&rdquo;
              </p>
            </div>
          </div>
          <div className="lg:col-span-7 flex flex-col sm:flex-row items-center justify-end gap-space-md">
            <div className="bg-surface-container-lowest p-space-md rounded-lg shadow-sm w-full sm:w-auto">
              <span className="font-label-uppercase text-[10px] text-outline tracking-wider block">WHATSAPP</span>
              <span className="font-body-md text-body-md text-primary font-semibold block">0314 8428115</span>
              <span className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">Ŕose Atelier, Karachi</span>
            </div>
            <a
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-space-lg py-3.5 rounded-full bg-primary text-on-primary hover:bg-secondary transition-all ${label} tracking-widest shadow-md`}
              href={`${whatsappUrl}?text=${encodeURIComponent("Hello Ŕose Atelier, I have a question about my coupon.")}`}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span className="material-symbols-outlined text-[18px]">chat</span>
              <span>MESSAGE US ON WHATSAPP</span>
            </a>
          </div>
        </div>
      </div>
    </RevealProvider>
  );
}

export default function OfferPage(props: PageProps<"/offers/[code]">) {
  return (
    <div className="flex flex-col w-full">
      <div className="relative w-full overflow-hidden bg-surface pb-space-xl">
        {/* Subtle ambient glow (from the design) */}
        <div aria-hidden="true" className="absolute -top-40 right-10 w-96 h-96 rounded-full bg-secondary-container/40 blur-3xl pointer-events-none" />
        <div aria-hidden="true" className="absolute top-80 -left-20 w-80 h-80 rounded-full bg-surface-container-highest/60 blur-3xl pointer-events-none" />
        <div className="relative max-w-[1360px] mx-auto px-margin-mobile lg:px-margin pt-space-md">
          <Suspense fallback={<div className="h-[640px] max-w-4xl mx-auto rounded-xl bg-surface-container motion-safe:animate-pulse" />}>
            <Offer {...props} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
