"use client";

import { useActionState, useState } from "react";
import { saveSettings, type SettingsFormState } from "@/app/admin/actions";
import type { GalleryImage } from "@/lib/products";
import GalleryUploader from "./GalleryUploader";
import DeliveryEditor from "./DeliveryEditor";
import { POLICY_PAGES, type DeliveryOption, type PolicySlug } from "@/lib/site";

export default function SettingsForm({
  announcements,
  heroSlides,
  deliveryOptions,
  deliveryConfigured,
  maxDelivery,
  policies,
  maxLines,
  maxLength,
  maxSlides,
}: {
  announcements: string[];
  heroSlides: GalleryImage[];
  deliveryOptions: DeliveryOption[];
  deliveryConfigured: boolean;
  maxDelivery: number;
  policies: Record<PolicySlug, string>;
  maxLines: number;
  maxLength: number;
  maxSlides: number;
}) {
  const [state, action, pending] = useActionState<SettingsFormState, FormData>(
    saveSettings,
    undefined,
  );
  const [text, setText] = useState(announcements.join("\n"));
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <form action={action} className="flex flex-col gap-4">
      <section className="panel p-4 flex flex-col gap-3">
        <div>
          <p className="muted">
            The home page background slideshow. The first slide loads first, so
            use your strongest photo. Wide (landscape) photos of at least 2000px
            work best; text sits on the left, so keep the shoes towards the
            right or centre.
          </p>
        </div>
        <GalleryUploader
          captions={false}
          coverLabel="slide 1 shows first"
          initial={heroSlides}
          max={maxSlides}
          name="heroSlides"
          preset="hero"
          sizeNote="resized to fit 2400×2400"
          tileAspect="aspect-video"
          title="Home hero slides"
        />
      </section>

      <section className="panel p-4 flex flex-col gap-3">
        <div>
          <h2>Announcement bar</h2>
          <p className="muted">
            The scrolling strip at the very top of every store page. One message
            per line.
          </p>
        </div>
        <label className="field">
          Messages ({lines.length}/{maxLines})
          <textarea
            name="announcements"
            onChange={(e) => setText(e.target.value)}
            rows={6}
            value={text}
          />
        </label>
        <ul className="flex flex-col gap-1 text-xs">
          {lines.map((l, i) => (
            <li key={i} className={l.length > maxLength ? "error" : "muted"}>
              {i + 1}. {l.length}/{maxLength} characters
            </li>
          ))}
        </ul>
        <div
          className="rounded bg-[#1b1c1a] text-[#ece0dc] px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] overflow-hidden whitespace-nowrap"
          aria-label="Preview"
        >
          {lines.join("  ◆  ") || "—"}
        </div>
      </section>
      <section className="panel p-4 flex flex-col gap-3">
        <div>
          <h2>Delivery options</h2>
          <p className="muted">Shown at checkout. The fee is added to the order total.</p>
          {!deliveryConfigured && (
            <p className="notice notice-bad mt-2">
              Not set up yet. Customers currently see a placeholder &ldquo;Standard Delivery&rdquo; at PKR 0. Enter your
              real couriers, delivery times and fees, then save.
            </p>
          )}
        </div>
        <DeliveryEditor initial={deliveryOptions} max={maxDelivery} />
      </section>

      <section className="panel p-4 flex flex-col gap-3">
        <div>
          <h2>Policy pages</h2>
          <p className="muted">
            Linked from the footer and checkout. Plain text: leave a blank line between paragraphs. Pages left empty show
            &ldquo;being prepared&rdquo; with your WhatsApp contact.
          </p>
        </div>
        {POLICY_PAGES.map((p) => (
          <label key={p.slug} className="field">
            {p.title} <span className="muted font-normal">(/policies/{p.slug})</span>
            <textarea defaultValue={policies[p.slug]} name={`policy:${p.slug}`} rows={6} />
          </label>
        ))}
      </section>

      {state && (
        <p
          className={`notice ${state.error ? "notice-bad" : "notice-ok"}`}
          role="status"
        >
          {state.error ?? state.ok}
        </p>
      )}
      <button
        className="btn btn-primary self-start"
        disabled={pending}
        type="submit"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
