import "server-only";
import { getDb } from "./db";
import { deleteStoredFiles, listStoredFiles, type StoredFile } from "./images";

/**
 * Finds photos in UploadThing that nothing uses any more: uploaded in the admin
 * (listing gallery, hero slide) or for a review, but never saved, or replaced
 * without being cleaned up.
 *
 * A file counts as used when its key, or a URL pointing at it, appears in a
 * listing (photo 1 and the gallery), a hero slide, an order line (orders keep
 * the photo they were placed with) or a review. Fresh files are always kept,
 * because a listing or review may still be in the middle of being saved.
 */

/** UploadThing file key from a `https://<app>.ufs.sh/f/<key>` (or older utfs.io) URL. */
function keyFromUrl(url: unknown): string | null {
  if (typeof url !== "string") return null;
  const m = url.match(/^https:\/\/(?:[a-z0-9]+\.ufs\.sh|utfs\.io)\/f\/([\w.-]+)$/i);
  return m ? m[1] : null;
}

/** Every file key the database still refers to. */
export async function referencedKeys(): Promise<Set<string>> {
  const db = await getDb();
  const keys = new Set<string>();
  const add = (k: unknown) => {
    if (typeof k === "string" && k) keys.add(k);
  };
  const addPhoto = (p: { key?: unknown; url?: unknown } | null | undefined) => {
    add(p?.key);
    add(keyFromUrl(p?.url));
  };

  const [products, settings, orders, reviews] = await Promise.all([
    db.collection("products").find({}, { projection: { image: 1, imageKey: 1, gallery: 1 } }).toArray(),
    db.collection("settings").find({}, { projection: { heroSlides: 1 } }).toArray(),
    db.collection("orders").find({}, { projection: { "items.image": 1 } }).toArray(),
    db.collection("reviews").find({}, { projection: { photos: 1 } }).toArray(),
  ]);
  for (const p of products) {
    add(p.imageKey);
    add(keyFromUrl(p.image));
    for (const g of p.gallery ?? []) addPhoto(g);
  }
  for (const s of settings) for (const h of s.heroSlides ?? []) addPhoto(h);
  for (const o of orders) for (const i of o.items ?? []) add(keyFromUrl(i.image));
  for (const r of reviews) for (const ph of r.photos ?? []) addPhoto(ph);
  return keys;
}

export type CleanupScan = {
  /** Files nothing uses, older than the safety age. */
  unused: StoredFile[];
  unusedBytes: number;
  /** All finished files in storage. */
  total: number;
  /** Files kept only because they are newer than the safety age. */
  tooNew: number;
  minAgeHours: number;
};

/** Looks without deleting anything. */
export async function scanUnusedUploads(minAgeHours = 24): Promise<CleanupScan> {
  const [files, used] = await Promise.all([listStoredFiles(), referencedKeys()]);
  const cutoff = Date.now() - minAgeHours * 3_600_000;
  const unused: StoredFile[] = [];
  let tooNew = 0;
  for (const f of files) {
    if (used.has(f.key)) continue;
    if (f.uploadedAt > cutoff) tooNew++;
    else unused.push(f);
  }
  unused.sort((a, b) => a.uploadedAt - b.uploadedAt);
  return { unused, unusedBytes: unused.reduce((n, f) => n + f.size, 0), total: files.length, tooNew, minAgeHours };
}

export class CleanupRefused extends Error {}

/**
 * Deletes the unused files. It always scans again first and never takes a list
 * from the browser. As a safety net it refuses when the database seems to
 * reference nothing while storage holds files (a failed or empty read must
 * never wipe every photo), and, for the automatic run, when more than half of
 * all files would go.
 */
export async function deleteUnusedUploads(opts: { minAgeHours?: number; automatic?: boolean } = {}) {
  const scan = await scanUnusedUploads(opts.minAgeHours ?? 24);
  if (scan.unused.length === 0) return { deleted: 0, freedBytes: 0, scan };
  const used = scan.total - scan.unused.length - scan.tooNew;
  if (used === 0 && scan.total > 0) {
    throw new CleanupRefused("No photo in storage is used by the database. Cleanup stopped to be safe: check that the site is connected to the right database.");
  }
  if (opts.automatic && scan.unused.length > scan.total / 2) {
    throw new CleanupRefused(`The automatic cleanup would remove ${scan.unused.length} of ${scan.total} files, which is unusual. Nothing was deleted; run it from the admin panel after checking.`);
  }
  const keys = scan.unused.map((f) => f.key);
  const deleted = await deleteStoredFiles(keys);
  // Forget upload records for review photos that were never posted.
  await (await getDb()).collection("review_uploads").deleteMany({ _id: { $in: keys } as never });
  return { deleted, freedBytes: scan.unusedBytes, scan };
}
