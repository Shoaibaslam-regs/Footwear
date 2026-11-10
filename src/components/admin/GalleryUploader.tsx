"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MAX_GALLERY, type GalleryImage } from "@/lib/products";

const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff";
const MAX_MB = 15;

type Photo = GalleryImage & { id: string };
type Pending = { id: string; name: string; progress: number; stage: "uploading" | "compressing" };
type Uploaded = { url: string; key: string; width: number; height: number; bytes: number; originalBytes: number };

const size = (b: number) => (b >= 1024 * 1024 ? `${(b / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
let seq = 0;
const uid = () => `p${Date.now().toString(36)}${(seq++).toString(36)}`;

/** POSTs with XHR so we can show upload progress. */
function send(file: File, preset: string, onProgress: (pct: number) => void): Promise<Uploaded> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append("file", file);
    body.append("preset", preset);
    xhr.open("POST", "/api/admin/images");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve(xhr.response as Uploaded)
        : reject(new Error(xhr.response?.error ?? `Upload failed (${xhr.status}).`));
    xhr.onerror = () => reject(new Error("Network error during upload."));
    xhr.send(body);
  });
}

/** Default description from the file name: "rose-gold_heel.jpg" → "Rose gold heel". */
function altFromName(name: string, productName: string) {
  const base = name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
  const nice = base && !/^(img|dsc|image|photo|pxl)?\s*\d+$/i.test(base) ? base : "";
  return (nice ? nice.charAt(0).toUpperCase() + nice.slice(1) : productName || "Product photo").slice(0, 300);
}

export default function GalleryUploader({
  initial,
  productName = "",
  error,
  name = "gallery",
  max = MAX_GALLERY,
  title = "Photos",
  coverLabel = "first photo is the cover",
  captions = true,
  preset = "product",
  tileAspect = "aspect-[3/4]",
  sizeNote = "resized to fit 1600×2000",
}: {
  initial?: GalleryImage[];
  productName?: string;
  error?: string[];
  /** Hidden input name holding the JSON array. */
  name?: string;
  max?: number;
  title?: string;
  coverLabel?: string;
  captions?: boolean;
  /** Server resize preset (see IMAGE_PRESETS). */
  preset?: "product" | "hero";
  tileAspect?: string;
  sizeNote?: string;
}) {
  const [photos, setPhotos] = useState<Photo[]>(() => (initial ?? []).map((g) => ({ ...g, id: uid() })));
  const [pending, setPending] = useState<Pending[]>([]);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);
  const [dropActive, setDropActive] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [pasteUrl, setPasteUrl] = useState("");
  /** The link box is optional: hidden until asked for, so uploading is the obvious way to add a photo. */
  const [showLink, setShowLink] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const slotsLeft = max - photos.length - pending.length;
  const serialised = JSON.stringify(photos.map(({ url, key, alt, caption }) => ({ url, key, alt, caption })));

  const update = (id: string, change: Partial<GalleryImage>) =>
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...change } : p)));
  const remove = (id: string) => setPhotos((list) => list.filter((p) => p.id !== id));
  const move = (from: number, to: number) =>
    setPhotos((list) => {
      if (to < 0 || to >= list.length || from === to) return list;
      const next = [...list];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });

  async function addFiles(files: File[]) {
    const notes: { ok: boolean; text: string }[] = [];
    const accepted = files.filter((f) => {
      if (!ACCEPT.split(",").includes(f.type)) {
        notes.push({ ok: false, text: `${f.name}: use JPEG, PNG, WebP, AVIF, GIF or TIFF.` });
        return false;
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        notes.push({ ok: false, text: `${f.name}: images must be under ${MAX_MB} MB.` });
        return false;
      }
      return true;
    });
    if (accepted.length > slotsLeft) {
      notes.push({
        ok: false,
        text: `Only ${max} photos allowed: ${accepted.length - Math.max(0, slotsLeft)} file(s) skipped.`,
      });
    }
    const queue = accepted.slice(0, Math.max(0, slotsLeft)).map((file) => ({ file, id: uid() }));
    setMessages(notes);
    setPending((p) => [...p, ...queue.map((q) => ({ id: q.id, name: q.file.name, progress: 0, stage: "uploading" as const }))]);

    // One at a time keeps the server's compression work predictable.
    for (const { file, id } of queue) {
      try {
        const r = await send(file, preset, (pct) =>
          setPending((list) =>
            list.map((p) => (p.id === id ? { ...p, progress: pct, stage: pct === 100 ? "compressing" : "uploading" } : p)),
          ),
        );
        setPhotos((list) => [...list, { id, url: r.url, key: r.key, alt: altFromName(file.name, productName), caption: "" }]);
        const saved = Math.max(0, Math.round((1 - r.bytes / r.originalBytes) * 100));
        setMessages((m) => [
          ...m,
          { ok: true, text: `${file.name}: ${size(r.originalBytes)} → ${size(r.bytes)}${saved ? ` (−${saved}%)` : ""}, ${r.width}×${r.height} WebP` },
        ]);
      } catch (e) {
        setMessages((m) => [...m, { ok: false, text: `${file.name}: ${e instanceof Error ? e.message : "upload failed"}` }]);
      } finally {
        setPending((list) => list.filter((p) => p.id !== id));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function addByUrl() {
    const url = pasteUrl.trim();
    if (!/^https:\/\/\S+$/.test(url)) {
      setMessages([{ ok: false, text: "Paste a full https:// image URL." }]);
      return;
    }
    if (slotsLeft <= 0) return;
    setPhotos((list) => [...list, { id: uid(), url, key: "", alt: productName || "Product photo", caption: "" }]);
    setPasteUrl("");
    setMessages([]);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Photos</legend>
      <input name={name} type="hidden" value={serialised} />

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2>
          {title}{" "}
          <span className="muted font-normal">
            ({photos.length}/{max}) · {coverLabel}
          </span>
        </h2>
        <button
          className="btn"
          disabled={slotsLeft <= 0}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          Add photos
        </button>
        <input
          ref={fileRef}
          accept={ACCEPT}
          className="sr-only"
          multiple
          onChange={(e) => addFiles([...(e.target.files ?? [])])}
          tabIndex={-1}
          type="file"
        />
      </div>

      <ol
        className={`grid grid-cols-2 sm:grid-cols-3 gap-3 rounded-lg p-1 border-2 border-dashed transition-colors ${
          dropActive ? "border-[var(--a-accent)] bg-surface-container-low" : "border-transparent"
        }`}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropActive(false);
        }}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setDropActive(true);
          }
        }}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setDropActive(false);
          addFiles([...e.dataTransfer.files]);
        }}
      >
        {photos.map((p, i) => (
          <li
            key={p.id}
            className={`flex flex-col gap-2 rounded-md border bg-white p-2 ${
              dragId === p.id ? "opacity-50" : ""
            } ${i === 0 ? "border-[var(--a-accent)]" : "border-[var(--a-line)]"}`}
            draggable
            onDragEnd={() => setDragId(null)}
            onDragOver={(e) => {
              if (dragId) e.preventDefault();
            }}
            onDragStart={(e) => {
              setDragId(p.id);
              e.dataTransfer.effectAllowed = "move";
            }}
            onDrop={(e) => {
              if (!dragId) return;
              e.preventDefault();
              e.stopPropagation();
              move(photos.findIndex((x) => x.id === dragId), i);
              setDragId(null);
            }}
          >
            <div className={`relative ${tileAspect} rounded overflow-hidden bg-surface-container cursor-grab active:cursor-grabbing`}>
              <Image alt="" className="object-cover pointer-events-none" fill sizes="200px" src={p.url} unoptimized />
              <span className={`absolute top-1 left-1 tag ${i === 0 ? "bg-[var(--a-accent)] text-white border-transparent" : "bg-white"}`}>
                {i === 0 ? "Cover" : i + 1}
              </span>
              {!p.key && (
                <span
                  className="absolute bottom-1 left-1 tag bg-white text-xs"
                  title={p.url.startsWith("/") ? "A built-in photo from the website. Upload your own to replace it." : "Added from a link, not uploaded."}
                >
                  {p.url.startsWith("/") ? "Built-in" : "Link"}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-1">
              <button aria-label={`Move photo ${i + 1} earlier`} className="btn h-8 px-2" disabled={i === 0} onClick={() => move(i, i - 1)} type="button">
                ←
              </button>
              <button
                aria-label={`Move photo ${i + 1} later`}
                className="btn h-8 px-2"
                disabled={i === photos.length - 1}
                onClick={() => move(i, i + 1)}
                type="button"
              >
                →
              </button>
              {i > 0 && (
                <button className="btn h-8 px-2 text-xs" onClick={() => move(i, 0)} type="button">
                  Make cover
                </button>
              )}
              <button aria-label={`Remove photo ${i + 1}`} className="btn btn-danger h-8 px-2 ml-auto shrink-0" onClick={() => remove(p.id)} type="button">
                ✕
              </button>
            </div>
            {captions && (
            <label className="field text-xs">
              Caption <span className="muted font-normal">(optional)</span>
              <input
                className="input h-8"
                maxLength={24}
                onChange={(e) => update(p.id, { caption: e.target.value })}
                placeholder="e.g. Heel"
                value={p.caption}
              />
            </label>
            )}
            <label className="field text-xs">
              Description (alt text)
              <textarea
                className="text-xs"
                maxLength={300}
                onChange={(e) => update(p.id, { alt: e.target.value })}
                rows={2}
                value={p.alt}
              />
            </label>
          </li>
        ))}

        {pending.map((p) => (
          <li key={p.id} className="flex flex-col gap-2 rounded-md border border-[var(--a-line)] bg-white p-2">
            <div className={`${tileAspect} rounded bg-surface-container flex flex-col items-center justify-center gap-2 px-3 text-center`}>
              <span className="text-xs font-medium truncate max-w-full">{p.name}</span>
              <span className="muted text-xs">{p.stage === "uploading" ? `Uploading ${p.progress}%` : "Compressing…"}</span>
              <div className="w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-[var(--a-accent)] transition-all" style={{ width: `${p.stage === "compressing" ? 100 : p.progress}%` }} />
              </div>
            </div>
          </li>
        ))}

        {slotsLeft > 0 && (
          <li>
            <button
              className={`w-full ${tileAspect} rounded-md border-2 border-dashed border-[var(--a-line)] hover:border-outline flex flex-col items-center justify-center gap-1 muted`}
              onClick={() => fileRef.current?.click()}
              type="button"
            >
              <span className="text-2xl leading-none">+</span>
              <span className="text-xs">Add or drop photos</span>
              <span className="text-xs">{slotsLeft} left</span>
            </button>
          </li>
        )}
      </ol>

      <p className="muted text-xs">
        Drag photos to reorder. Up to {MAX_MB} MB each: {sizeNote}, made smaller automatically, and camera and
        location details are removed.
      </p>

      {slotsLeft > 0 && !showLink && (
        <button className="btn-text muted text-xs self-start underline underline-offset-4" onClick={() => setShowLink(true)} type="button">
          Use an image link instead (optional)
        </button>
      )}
      {slotsLeft > 0 && showLink && (
        <div className="flex gap-2">
          <input
            aria-label="Image link (optional)"
            autoComplete="off"
            className="input"
            inputMode="url"
            onChange={(e) => setPasteUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addByUrl();
              }
            }}
            placeholder="Paste an https:// image link"
            type="text"
            value={pasteUrl}
          />
          <button className="btn" onClick={addByUrl} type="button">
            Add link
          </button>
          <button
            className="btn"
            onClick={() => {
              setShowLink(false);
              setPasteUrl("");
            }}
            type="button"
          >
            Cancel
          </button>
        </div>
      )}

      {messages.length > 0 && (
        <ul aria-live="polite" className="flex flex-col gap-1" role="status">
          {messages.map((m, i) => (
            <li key={i} className={`notice text-xs ${m.ok ? "notice-ok" : "notice-bad"}`}>
              {m.text}
            </li>
          ))}
        </ul>
      )}
      {error?.length ? (
        <p className="error" role="alert">
          {error.join(" ")}
        </p>
      ) : null}
      {pending.length > 0 && <p className="muted text-xs">Wait for uploads to finish before saving.</p>}
    </fieldset>
  );
}
