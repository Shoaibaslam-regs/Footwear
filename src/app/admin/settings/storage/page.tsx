import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { storageUsage } from "@/lib/server/images";
import { scanUnusedUploads } from "@/lib/server/storage-cleanup";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { cleanupUploads } from "./actions";

export const metadata = { title: "Photo storage" };

const size = (b: number) =>
  b >= 1024 ** 3 ? `${(b / 1024 ** 3).toFixed(2)} GB` : b >= 1024 ** 2 ? `${(b / 1024 ** 2).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
const when = (ms: number) =>
  new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Karachi" });
const SHOWN = 50;

async function StorageContent({ searchParams }: PageProps<"/admin/settings/storage">) {
  await requireAdmin();
  const sp = await searchParams;
  // The scan compares upload times with the current time.
  await io();
  let scan: Awaited<ReturnType<typeof scanUnusedUploads>>;
  let usage: Awaited<ReturnType<typeof storageUsage>> | null = null;
  try {
    [scan, usage] = await Promise.all([scanUnusedUploads(24), storageUsage().catch(() => null)]);
  } catch (e) {
    console.error("Storage scan failed", e);
    return (
      <div className="flex flex-col gap-4 max-w-3xl">
        <Header />
        <p className="notice notice-bad">Couldn&apos;t reach UploadThing to list your photos. Please refresh in a minute.</p>
      </div>
    );
  }
  const deleted = typeof sp.deleted === "string" ? Number(sp.deleted) : null;
  const freed = typeof sp.freed === "string" ? Number(sp.freed) : 0;
  const error = typeof sp.error === "string" ? sp.error : null;
  const n = scan.unused.length;

  return (
    <div className="flex flex-col gap-4 max-w-3xl">
      <Header />

      {deleted !== null && (
        <p className="notice notice-ok" role="status">
          {deleted === 0 ? "Nothing to delete." : `Deleted ${deleted} unused ${deleted === 1 ? "photo" : "photos"} and freed ${size(freed)}.`}
        </p>
      )}
      {error && (
        <p className="notice notice-bad" role="alert">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="panel p-4">
          <span className="muted text-[13px] block">Storage used</span>
          <span className="text-xl font-semibold">{usage ? size(usage.usedBytes) : "—"}</span>
          {usage && usage.limitBytes > 0 && <span className="muted text-xs block">of {size(usage.limitBytes)}</span>}
        </div>
        <div className="panel p-4">
          <span className="muted text-[13px] block">Photos stored</span>
          <span className="text-xl font-semibold">{scan.total.toLocaleString("en-US")}</span>
        </div>
        <div className="panel p-4 col-span-2 sm:col-span-1">
          <span className="muted text-[13px] block">Not used anywhere</span>
          <span className="text-xl font-semibold">
            {n} <span className="text-sm font-normal muted">· {size(scan.unusedBytes)}</span>
          </span>
        </div>
      </div>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--a-line)]">
          <div>
            <h2>Unused photos</h2>
            <p className="muted text-[13px]">
              Uploaded more than {scan.minAgeHours} hours ago and not used by any listing, hero slide, order or review.
              {scan.tooNew > 0 && ` ${scan.tooNew} newer ${scan.tooNew === 1 ? "photo is" : "photos are"} kept for now, in case a listing or review is still being saved.`}
            </p>
          </div>
          {n > 0 && (
            <form action={cleanupUploads}>
              <ConfirmButton
                confirmLabel={`Delete ${n}`}
                message={`${n} ${n === 1 ? "photo" : "photos"} (${size(scan.unusedBytes)}) will be removed from UploadThing for good. Photos on listings, hero slides, orders and reviews are not touched. This cannot be undone.`}
                title={`Delete ${n} unused ${n === 1 ? "photo" : "photos"}?`}
              >
                Delete {n} unused
              </ConfirmButton>
            </form>
          )}
        </div>
        {n === 0 ? (
          <p className="muted px-4 py-8 text-center">All clean. Every stored photo is in use.</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th className="text-right">Size</th>
                  <th className="text-right">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {scan.unused.slice(0, SHOWN).map((f) => (
                  <tr key={f.key}>
                    <td className="max-w-[28rem] truncate" title={f.key}>
                      {f.name}
                    </td>
                    <td className="text-right tabular-nums whitespace-nowrap">{size(f.size)}</td>
                    <td className="text-right whitespace-nowrap muted">{when(f.uploadedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {n > SHOWN && <p className="muted text-xs px-4 py-2">…and {n - SHOWN} more (oldest shown first).</p>}
          </div>
        )}
      </section>

      <p className="muted text-xs">
        This also runs by itself once a week on the live site (for photos more than 2 days old), when <code>CRON_SECRET</code> is set in Vercel.
      </p>
    </div>
  );
}

function Header() {
  return (
    <div>
      <Link className="link muted" href="/admin/settings">
        ← Settings
      </Link>
      <h1 className="mt-1">Photo storage</h1>
      <p className="muted">Photos uploaded but never saved still take up space in UploadThing. Clear them out here.</p>
    </div>
  );
}

/** Own Suspense: the content checks the login and lists files from UploadThing. */
export default function AdminStorage(props: PageProps<"/admin/settings/storage">) {
  return (
    <Suspense fallback={<p className="muted">Checking your photo storage…</p>}>
      <StorageContent {...props} />
    </Suspense>
  );
}
