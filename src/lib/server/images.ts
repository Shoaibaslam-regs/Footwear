import "server-only";
import sharp from "sharp";
import { UTApi, UTFile } from "uploadthing/server";

/** Largest file an admin may send before compression. */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
/** Resize targets: product photos are portrait; hero slides fill the screen. */
export const IMAGE_PRESETS = {
  product: { width: 1600, height: 2000, quality: 80 },
  hero: { width: 2400, height: 2400, quality: 78 },
  review: { width: 1200, height: 1200, quality: 78 },
} as const;
export type ImagePreset = keyof typeof IMAGE_PRESETS;

export const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif", "image/tiff"];

let api: UTApi | undefined;
const utapi = () => (api ??= new UTApi()); // reads UPLOADTHING_TOKEN

export type UploadedImage = {
  url: string;
  key: string;
  width: number;
  height: number;
  bytes: number;
  originalBytes: number;
};

export class ImageError extends Error {}

/**
 * Normalises a photo: honours EXIF rotation, fits it inside the preset's box
 * without upscaling (product 1600×2000, hero 2400×2400), strips metadata
 * (GPS etc.) and re-encodes as WebP.
 */
export async function compressImage(input: Buffer, preset: ImagePreset = "product") {
  const { width, height, quality } = IMAGE_PRESETS[preset];
  try {
    const { data, info } = await sharp(input, { limitInputPixels: 60_000_000, animated: false })
      .rotate()
      .resize({ width, height, fit: "inside", withoutEnlargement: true })
      .webp({ quality, effort: 5, smartSubsample: true })
      .toBuffer({ resolveWithObject: true });
    return { data, width: info.width, height: info.height };
  } catch {
    throw new ImageError("This file could not be read as an image.");
  }
}

export async function uploadProductImage(file: File, preset: ImagePreset = "product"): Promise<UploadedImage> {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    throw new ImageError("Use a JPEG, PNG, WebP, AVIF, GIF or TIFF image.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new ImageError(`Images must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.`);
  }
  const { data, width, height } = await compressImage(Buffer.from(await file.arrayBuffer()), preset);
  const base =
    file.name
      .replace(/\.[^.]+$/, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "product";
  const res = await utapi().uploadFiles(
    new UTFile([new Uint8Array(data)], `${base}.webp`, { type: "image/webp" }),
  );
  if (res.error) throw new Error(`UploadThing: ${res.error.message}`);
  return {
    url: res.data.ufsUrl,
    key: res.data.key,
    width,
    height,
    bytes: data.length,
    originalBytes: file.size,
  };
}

/** Best-effort removal of files we no longer reference. */
export async function deleteImages(keys: string[]) {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;
  try {
    await utapi().deleteFiles(unique);
  } catch (e) {
    console.error("UploadThing delete failed", e);
  }
}
