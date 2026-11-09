"use client";

import { useActionState, useState } from "react";
import { submitReview, deleteMyReview, type ReviewFormState } from "@/app/(shop)/products/actions";
import ConfirmButton from "@/components/ConfirmButton";
import Image from "next/image";
import { fitOptions, MAX_REVIEW_PHOTOS, type Fit, type ReviewPhoto } from "@/lib/reviews";

const label = "font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase font-semibold";
const input =
  "w-full px-space-md bg-surface-container-low text-on-surface font-body-md text-body-md focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all aria-invalid:ring-2 aria-invalid:ring-error";
const starLabels = ["Poor", "Fair", "Good", "Very good", "Exceptional"];

export type ExistingReview = {
  rating: number;
  title: string;
  body: string;
  fit: Fit;
  size: number | null;
  status: "published" | "hidden";
  photos: ReviewPhoto[];
};

function Err({ list }: { list?: string[] }) {
  return list?.length ? <p className="font-body-sm text-body-sm text-error">{list.join(" ")}</p> : null;
}

export default function ReviewForm({
  slug,
  sizes,
  existing,
  verified,
}: {
  slug: string;
  sizes: number[];
  existing: ExistingReview | null;
  verified: boolean;
}) {
  const [state, action, pending] = useActionState<ReviewFormState, FormData>(submitReview, undefined);
  const [rating, setRating] = useState(existing?.rating ?? 0);
  const [hover, setHover] = useState(0);
  const [editing, setEditing] = useState(!existing);
  const [photos, setPhotos] = useState<ReviewPhoto[]>(existing?.photos ?? []);
  const [uploading, setUploading] = useState(false);
  const [photoError, setPhotoError] = useState("");

  async function addPhotos(files: File[]) {
    setPhotoError("");
    const room = MAX_REVIEW_PHOTOS - photos.length;
    if (files.length > room) setPhotoError(`You can add up to ${MAX_REVIEW_PHOTOS} photos.`);
    setUploading(true);
    for (const file of files.slice(0, room)) {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/reviews/photos", { method: "POST", body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setPhotos((p) => [...p, { url: data.url, key: data.key }]);
      else setPhotoError(data.error ?? "Upload failed.");
    }
    setUploading(false);
  }
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    // A successful save closes the editor (the refreshed page passes `existing`).
    setSeen(state);
    if (state?.ok) setEditing(false);
  }
  const e = state?.errors ?? {};
  const shown = hover || rating;

  if (!editing && existing) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-space-md">
        <p className="font-body-md text-body-md text-on-surface-variant">
          {state?.ok ?? "You have reviewed this piece."}
          {existing.status === "hidden" && " It is currently hidden by our team."}
        </p>
        <div className="flex gap-space-sm">
          <button
            className="h-11 px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors"
            onClick={() => setEditing(true)}
            type="button"
          >
            Edit Review
          </button>
          <form action={deleteMyReview}>
            <input name="slug" type="hidden" value={slug} />
            <ConfirmButton
              className="h-11 px-space-lg rounded-full text-on-surface-variant hover:text-error font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors"
              confirm={{ title: "Delete your review?", message: "It will be removed from this product page.", confirmLabel: "Delete", cancelLabel: "Keep Review", tone: "danger" }}
            >
              Delete
            </ConfirmButton>
          </form>
        </div>
      </div>
    );
  }

  if (state?.ok && !existing) {
    return (
      <p className="font-body-md text-body-md text-primary flex items-center gap-2" role="status">
        <span className="material-symbols-outlined text-secondary">check_circle</span>
        {state.ok}
      </p>
    );
  }

  return (
    <form action={action} className="grid grid-cols-1 md:grid-cols-2 gap-space-md" noValidate>
      <input name="slug" type="hidden" value={slug} />
      <input name="rating" type="hidden" value={rating || ""} />
      <input name="photos" type="hidden" value={JSON.stringify(photos)} />

      <fieldset className="md:col-span-2 flex flex-col gap-1">
        <legend className={label}>Your rating *</legend>
        <div className="flex items-center gap-space-sm" onMouseLeave={() => setHover(0)}>
          <div className="flex" role="radiogroup" aria-label="Rating">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                aria-checked={rating === n}
                aria-label={`${n} star${n > 1 ? "s" : ""}: ${starLabels[n - 1]}`}
                className="p-0.5 text-secondary focus-visible:outline-2 focus-visible:outline-secondary rounded"
                onClick={() => setRating(n)}
                onMouseEnter={() => setHover(n)}
                role="radio"
                type="button"
              >
                <span className={`material-symbols-outlined text-[30px] ${n <= shown ? "icon-filled" : "text-outline-variant"}`}>star</span>
              </button>
            ))}
          </div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">{shown ? starLabels[shown - 1] : "Tap to rate"}</span>
        </div>
        <Err list={e.rating} />
      </fieldset>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label className={label} htmlFor="rv-title">
          Headline *
        </label>
        <input aria-invalid={e.title ? true : undefined} className={`${input} h-12`} defaultValue={existing?.title} id="rv-title" maxLength={80} name="title" placeholder="e.g. Comfortable all evening" />
        <Err list={e.title} />
      </div>

      <div className="flex flex-col gap-1 md:col-span-2">
        <label className={label} htmlFor="rv-body">
          Your review *
        </label>
        <textarea aria-invalid={e.body ? true : undefined} className={`${input} py-space-sm`} defaultValue={existing?.body} id="rv-body" maxLength={1500} name="body" placeholder="How do they look, feel and wear?" rows={4} />
        <Err list={e.body} />
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className={label}>How does it fit? *</legend>
        <div className="flex flex-wrap gap-space-xs pt-1">
          {fitOptions.map((f) => (
            <label key={f.value} className="cursor-pointer">
              <input className="peer sr-only" defaultChecked={existing?.fit === f.value} name="fit" type="radio" value={f.value} />
              <span className="inline-block px-space-md py-2 rounded-full bg-surface-container text-on-surface font-body-sm text-body-sm transition-colors peer-checked:bg-primary peer-checked:text-on-primary peer-focus-visible:ring-2 peer-focus-visible:ring-secondary">
                {f.label}
              </span>
            </label>
          ))}
        </div>
        <Err list={e.fit} />
      </fieldset>

      <div className="flex flex-col gap-1">
        <label className={label} htmlFor="rv-size">
          Size you bought <span className="normal-case font-normal">(optional)</span>
        </label>
        <select className={`${input} h-12 appearance-none`} defaultValue={existing?.size ?? ""} id="rv-size" name="size">
          <option value="">Prefer not to say</option>
          {sizes.map((s) => (
            <option key={s} value={s}>
              EU {s}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2 flex flex-col gap-space-xs">
        <span className={label}>
          Photos <span className="normal-case font-normal">(optional, up to {MAX_REVIEW_PHOTOS})</span>
        </span>
        <div className="flex flex-wrap items-center gap-space-sm">
          {photos.map((p, i) => (
            <div key={p.key} className="relative w-20 h-20 rounded-lg overflow-hidden bg-surface-container">
              <Image alt={`Your photo ${i + 1}`} className="object-cover" fill sizes="80px" src={p.url} />
              <button
                aria-label={`Remove photo ${i + 1}`}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-primary/80 text-on-primary flex items-center justify-center"
                onClick={() => setPhotos((list) => list.filter((x) => x.key !== p.key))}
                type="button"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            </div>
          ))}
          {photos.length < MAX_REVIEW_PHOTOS && (
            <label className={`w-20 h-20 rounded-lg border-2 border-dashed border-outline-variant flex flex-col items-center justify-center gap-0.5 text-on-surface-variant cursor-pointer hover:border-secondary ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
              <span className="material-symbols-outlined text-[22px]">{uploading ? "hourglass_top" : "add_a_photo"}</span>
              <span className="text-[10px] font-label-uppercase uppercase">{uploading ? "Uploading" : "Add"}</span>
              <input
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="sr-only"
                multiple
                onChange={(e) => {
                  addPhotos([...(e.target.files ?? [])]);
                  e.target.value = "";
                }}
                type="file"
              />
            </label>
          )}
        </div>
        {photoError && <p className="font-body-sm text-body-sm text-error">{photoError}</p>}
      </div>

      <div className="md:col-span-2 flex flex-wrap items-center justify-between gap-space-md pt-space-xs">
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {verified
            ? "Your review will show a Verified Purchase badge."
            : "Reviews from clients whose order was delivered get a Verified Purchase badge."}
        </p>
        <div className="flex gap-space-sm">
          {existing && (
            <button className="h-12 px-space-lg rounded-full bg-surface-container text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest" onClick={() => setEditing(false)} type="button">
              Cancel
            </button>
          )}
          <button
            className="h-12 px-8 rounded-full bg-primary text-on-primary hover:bg-secondary-fixed hover:text-on-secondary-fixed disabled:opacity-60 transition-all duration-300 font-label-uppercase text-label-uppercase uppercase tracking-widest shadow-md"
            disabled={pending || uploading}
            type="submit"
          >
            {pending ? "Posting…" : existing ? "Update Review" : "Post Review"}
          </button>
        </div>
      </div>
      {state?.message && (
        <p className="md:col-span-2 font-body-sm text-body-sm text-on-error-container bg-error-container px-space-md py-space-sm" role="alert">
          {state.message}
        </p>
      )}
    </form>
  );
}
