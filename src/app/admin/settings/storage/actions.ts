"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { CleanupRefused, deleteUnusedUploads } from "@/lib/server/storage-cleanup";

/** Deletes every photo nothing uses (scanned again on the server, never a list from the browser). */
export async function cleanupUploads() {
  await requireAdmin();
  let to: string;
  try {
    const r = await deleteUnusedUploads({ minAgeHours: 24 });
    to = `/admin/settings/storage?deleted=${r.deleted}&freed=${r.freedBytes}`;
  } catch (e) {
    const msg = e instanceof CleanupRefused ? e.message : "UploadThing didn't answer. Nothing was deleted; please try again.";
    if (!(e instanceof CleanupRefused)) console.error("Storage cleanup failed", e);
    to = `/admin/settings/storage?error=${encodeURIComponent(msg)}`;
  }
  redirect(to);
}
