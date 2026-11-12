import { timingSafeEqual } from "node:crypto";
import { CleanupRefused, deleteUnusedUploads } from "@/lib/server/storage-cleanup";

/**
 * Weekly cleanup of unused photos, called by Vercel Cron (see vercel.json).
 * Vercel sends `Authorization: Bearer <CRON_SECRET>`; without CRON_SECRET set
 * the route refuses everyone, so it can't be triggered from outside.
 * The automatic run is more careful than the admin button: only photos more
 * than 2 days old, and it stops if more than half of all files would go.
 */
export const maxDuration = 60;

function authorised(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false;
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(request: Request) {
  if (!authorised(request)) return new Response("Unauthorized", { status: 401 });
  try {
    const r = await deleteUnusedUploads({ minAgeHours: 48, automatic: true });
    return Response.json({ deleted: r.deleted, freedBytes: r.freedBytes, stored: r.scan.total, keptAsNew: r.scan.tooNew });
  } catch (e) {
    if (e instanceof CleanupRefused) return Response.json({ deleted: 0, refused: e.message }, { status: 409 });
    console.error("Scheduled storage cleanup failed", e);
    return Response.json({ deleted: 0, error: "cleanup failed" }, { status: 500 });
  }
}
