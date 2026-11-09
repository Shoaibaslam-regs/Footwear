import { getCurrentUser } from "@/lib/auth/dal";
import { ImageError, uploadProductImage } from "@/lib/server/images";
import { DAILY_REVIEW_UPLOADS, recordUpload, uploadsToday } from "@/lib/server/review-uploads";

/** Signed-in clients upload review photos (compressed to 1200px WebP). */
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Please log in to add photos." }, { status: 401 });
  if ((await uploadsToday(user.id)) >= DAILY_REVIEW_UPLOADS) {
    return Response.json({ error: "You've reached today's photo limit. Please try again tomorrow." }, { status: 429 });
  }
  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return Response.json({ error: "Send the photo as multipart form data." }, { status: 400 });
  }
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "Choose a photo." }, { status: 400 });
  try {
    const up = await uploadProductImage(file, "review");
    await recordUpload(user.id, up.key);
    return Response.json({ url: up.url, key: up.key }, { status: 201 });
  } catch (e) {
    if (e instanceof ImageError) return Response.json({ error: e.message }, { status: 422 });
    console.error(e);
    return Response.json({ error: "Upload failed. Please try again." }, { status: 502 });
  }
}
