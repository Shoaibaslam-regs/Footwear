import { getCurrentUser } from "@/lib/auth/dal";
import { IMAGE_PRESETS, ImageError, uploadProductImage, type ImagePreset } from "@/lib/server/images";

/**
 * POST multipart/form-data { file } → compresses with sharp and stores the
 * result on UploadThing. Admin only.
 */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Sign in required." }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Admins only." }, { status: 403 });

  let file: FormDataEntryValue | null;
  let preset: ImagePreset = "product";
  try {
    const form = await request.formData();
    file = form.get("file");
    const p = String(form.get("preset") ?? "");
    if (p in IMAGE_PRESETS) preset = p as ImagePreset;
  } catch {
    return Response.json({ error: "Send the image as multipart form data." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) {
    return Response.json({ error: "Choose an image to upload." }, { status: 400 });
  }

  try {
    return Response.json(await uploadProductImage(file, preset), { status: 201 });
  } catch (e) {
    if (e instanceof ImageError) return Response.json({ error: e.message }, { status: 422 });
    console.error(e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
