"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import type { ReviewPhoto } from "@/lib/reviews";
import dynamic from "next/dynamic";

// Full-screen viewer code loads only when a photo is opened.
const PhotoViewer = dynamic(() => import("./PhotoViewer"), { ssr: false });

/** Review photo thumbnails that open the full-screen viewer. */
export default function ReviewPhotos({ photos, author }: { photos: ReviewPhoto[]; author: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const close = useCallback(() => setOpen(null), []);
  if (photos.length === 0) return null;
  return (
    <>
      <div className="flex gap-space-xs">
        {photos.map((p, i) => (
          <button
            key={p.key}
            aria-label={`Open photo ${i + 1} from ${author}`}
            className="relative w-16 h-16 rounded-md overflow-hidden bg-surface-container cursor-zoom-in"
            onClick={() => setOpen(i)}
            type="button"
          >
            <Image alt="" className="object-cover" fill sizes="64px" src={p.url} />
          </button>
        ))}
      </div>
      {open !== null && <PhotoViewer onClose={close} photos={photos.map((p, i) => ({ src: p.url, alt: `Photo ${i + 1} from ${author}'s review` }))} start={open} />}
    </>
  );
}
