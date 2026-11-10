import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import {
  getSiteSettings,
  MAX_ANNOUNCEMENT_LENGTH,
  MAX_ANNOUNCEMENTS,
  MAX_DELIVERY_OPTIONS,
  MAX_HERO_SLIDES,
} from "@/lib/server/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const metadata = { title: "Settings" };

async function AdminSettingsContent() {
  await requireAdmin();
  const settings = await getSiteSettings();
  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <h1>Settings</h1>
      <SettingsForm
        announcements={settings.announcements}
        heroSlides={settings.heroSlides}
        deliveryConfigured={settings.deliveryConfigured}
        deliveryOptions={settings.deliveryOptions}
        maxDelivery={MAX_DELIVERY_OPTIONS}
        policies={settings.policies}
        maxSlides={MAX_HERO_SLIDES}
        maxLength={MAX_ANNOUNCEMENT_LENGTH}
        maxLines={MAX_ANNOUNCEMENTS}
      />
    </div>
  );
}

/**
 * Its own loading placeholder: requireAdmin() verifies the login token (async
 * crypto), so the content streams inside the page; otherwise navigations to it
 * can't be instant and Next.js warns "uncached data … outside of <Suspense>".
 */
export default function AdminSettings() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminSettingsContent />
    </Suspense>
  );
}
