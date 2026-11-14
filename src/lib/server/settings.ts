import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { heroSlides as defaultHeroSlides } from "../data";
import type { GalleryImage } from "../products";
import type { DeliveryOption, PolicySlug } from "../site";
import { getDb } from "./db";

export const SETTINGS_TAG = "settings";
export const MAX_ANNOUNCEMENTS = 6;
export const MAX_ANNOUNCEMENT_LENGTH = 90;
export const MAX_HERO_SLIDES = 8;
export const MAX_DELIVERY_OPTIONS = 5;
export { POLICY_PAGES, type DeliveryOption, type PolicySlug } from "../site";

export type SiteSettings = {
  /** Messages scrolling in the top marquee (at least one). */
  announcements: string[];
  /** Home hero background slideshow (1–8 photos; the first loads first). */
  heroSlides: GalleryImage[];
  /** Offered at checkout; the fee is added to the order total. */
  deliveryOptions: DeliveryOption[];
  /** Plain-text policy pages (blank = "being prepared"). */
  policies: Record<PolicySlug, string>;
  /** False until an admin has saved their own delivery options. */
  deliveryConfigured: boolean;
};

/** Shown until an admin saves their own messages. Only factual claims. */
const DEFAULT_SETTINGS: SiteSettings = {
  // Placeholder until the business enters its real couriers and charges.
  deliveryOptions: [
    {
      id: "standard",
      name: "Standard Delivery",
      eta: "Delivery date confirmed by our team",
      description: "Nationwide courier delivery across Pakistan.",
      fee: 0,
    },
  ],
  policies: { "shipping-returns": "", privacy: "", terms: "" },
  deliveryConfigured: false,
  heroSlides: defaultHeroSlides().map((s) => ({ url: s.image, key: "", alt: s.alt, caption: "" })),
  announcements: [
    "Cash on Delivery across Pakistan",
    "Pakistani size guide on every product",
    "Questions? WhatsApp 0314 8428115",
  ],
};

type SettingsDoc = SiteSettings & { _id: "site"; updatedAt: Date };

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  cacheTag(SETTINGS_TAG);
  cacheLife("days");
  const doc = await (await getDb()).collection<SettingsDoc>("settings").findOne({ _id: "site" });
  return {
    announcements: doc?.announcements?.length ? doc.announcements : DEFAULT_SETTINGS.announcements,
    heroSlides: doc?.heroSlides?.length ? doc.heroSlides : DEFAULT_SETTINGS.heroSlides,
    deliveryOptions: doc?.deliveryOptions?.length ? doc.deliveryOptions : DEFAULT_SETTINGS.deliveryOptions,
    policies: { ...DEFAULT_SETTINGS.policies, ...(doc?.policies ?? {}) },
    deliveryConfigured: !!doc?.deliveryOptions?.length,
  };
}

export async function saveSiteSettings(s: Partial<Omit<SiteSettings, "deliveryConfigured">>) {
  await (await getDb())
    .collection<SettingsDoc>("settings")
    .updateOne({ _id: "site" }, { $set: { ...s, updatedAt: new Date() } }, { upsert: true });
}
