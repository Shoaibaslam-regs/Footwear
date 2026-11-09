import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { whatsappUrl } from "@/lib/data";
import { getSiteSettings } from "@/lib/server/settings";
import { POLICY_PAGES } from "@/lib/site";

export function generateStaticParams() {
  return POLICY_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/policies/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  return page ? { title: `${page.title} — ÉLORA Maison` } : {};
}

export default async function PolicyPage({ params }: PageProps<"/policies/[slug]">) {
  const { slug } = await params;
  const page = POLICY_PAGES.find((p) => p.slug === slug);
  if (!page) notFound();
  const { policies, deliveryOptions } = await getSiteSettings();
  const text = policies[page.slug].trim();
  const paragraphs = text ? text.split(/\n\s*\n/) : [];

  return (
    <article className="w-full max-w-3xl mx-auto px-margin-mobile lg:px-margin pt-space-md pb-space-xl">
      <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-[0.2em]">
        Client Care
      </span>
      <h1 className="font-headline-lg-mobile text-headline-lg-mobile lg:font-headline-lg lg:text-headline-lg text-primary tracking-tight mt-1 mb-space-lg">
        {page.title}
      </h1>

      {page.slug === "shipping-returns" && (
        <section className="mb-space-lg bg-surface-container-lowest rounded-xl shadow-sm p-space-lg">
          <h2 className="font-headline-sm text-headline-sm text-primary mb-space-sm">Delivery options</h2>
          <ul className="divide-y divide-outline-variant/30">
            {deliveryOptions.map((o) => (
              <li key={o.id} className="py-space-sm flex items-start justify-between gap-space-md">
                <span>
                  <span className="block font-body-md text-body-md text-primary font-medium">{o.name}</span>
                  <span className="block font-body-sm text-body-sm text-on-surface-variant">
                    {[o.eta, o.description].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <span className="font-label-md text-label-md text-primary font-semibold whitespace-nowrap">
                  {o.fee === 0 ? "Free" : `PKR ${o.fee.toLocaleString("en-US")}`}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {paragraphs.length > 0 ? (
        <div className="space-y-space-md font-body-md text-body-md text-on-surface-variant leading-relaxed">
          {paragraphs.map((p, i) => (
            <p key={i} className="whitespace-pre-line">
              {p}
            </p>
          ))}
        </div>
      ) : (
        <p className="font-body-md text-body-md text-on-surface-variant">
          This page is being prepared. For any question about orders, delivery or exchanges, please{" "}
          <a className="text-primary underline underline-offset-4 decoration-secondary" href={whatsappUrl} rel="noopener noreferrer" target="_blank">
            message us on WhatsApp
          </a>
          .
        </p>
      )}

      <nav aria-label="Other policies" className="mt-space-xl pt-space-md border-t border-outline-variant/30 flex flex-wrap gap-space-md">
        {POLICY_PAGES.filter((p) => p.slug !== page.slug).map((p) => (
          <Link key={p.slug} className="font-label-uppercase text-label-uppercase uppercase tracking-widest text-primary hover:text-secondary" href={`/policies/${p.slug}`}>
            {p.title}
          </Link>
        ))}
      </nav>
    </article>
  );
}
