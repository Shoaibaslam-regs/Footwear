"use server";

import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/dal";
import { GREETING_STYLES, isShopLink } from "@/lib/greetings";
import { PLAQUE_BACKGROUNDS, PLAQUE_FRAMES } from "@/lib/plaque";
import { GREETINGS_TAG, greetings, type GreetingDoc } from "@/lib/server/greetings";

export type GreetingFormState = { errors?: Record<string, string[] | undefined>; message?: string } | undefined;

/** "YYYY-MM-DDTHH:MM" from a datetime-local input, read as Pakistan time. */
const when = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, "Pick a date and time.");
const pkt = (v: string) => new Date(`${v}:00+05:00`);

const schema = z
  .object({
    message: z.string().trim().min(2, "Write the greeting, e.g. Eid Mubarak.").max(40, "Keep the greeting under 40 characters."),
    line: z.string().trim().max(100, "Keep the line under 100 characters."),
    style: z.enum(GREETING_STYLES, "Choose the occasion."),
    background: z.enum(PLAQUE_BACKGROUNDS, "Choose a background."),
    scrollBg: z.enum(["gold", ...PLAQUE_BACKGROUNDS], "Choose the scroll's background."),
    frame: z.enum(PLAQUE_FRAMES, "Choose a frame."),
    linkLabel: z.string().trim().max(30, "Keep the link text under 30 characters."),
    linkHref: z.string().trim().max(200),
    startsAt: when,
    endsAt: when,
  })
  .superRefine((d, ctx) => {
    if (pkt(d.endsAt) <= pkt(d.startsAt)) ctx.addIssue({ code: "custom", path: ["endsAt"], message: "The end must be after the start." });
    if (d.linkHref && !isShopLink(d.linkHref)) ctx.addIssue({ code: "custom", path: ["linkHref"], message: "Use a page of this shop, starting with /, e.g. /collections." });
    if (!!d.linkHref !== !!d.linkLabel) ctx.addIssue({ code: "custom", path: [d.linkHref ? "linkLabel" : "linkHref"], message: "Give the link both a text and a page, or leave both empty." });
  });

export async function saveGreeting(_: GreetingFormState, fd: FormData): Promise<GreetingFormState> {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const parsed = schema.safeParse({ ...Object.fromEntries(["message", "line", "style", "background", "linkLabel", "linkHref", "startsAt", "endsAt"].map((k) => [k, String(fd.get(k) ?? "")])), scrollBg: String(fd.get("scrollBg") || "gold"), frame: String(fd.get("frame") || "gold") });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors, message: "Please fix the highlighted fields." };
  const d = parsed.data;
  const now = new Date();
  const fields = { message: d.message, line: d.line, style: d.style, background: d.background, scrollBg: d.scrollBg, frame: d.frame, linkLabel: d.linkLabel, linkHref: d.linkHref, startsAt: pkt(d.startsAt), endsAt: pkt(d.endsAt), updatedAt: now };
  const col = await greetings();
  if (id) {
    if (!ObjectId.isValid(id)) return { message: "Unknown greeting." };
    // Saving a stopped greeting brings it back on the dates given.
    const r = await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...fields, stoppedAt: null } });
    if (!r.matchedCount) return { message: "This greeting no longer exists." };
  } else {
    const doc: GreetingDoc = { _id: new ObjectId(), ...fields, stoppedAt: null, createdAt: now };
    await col.insertOne(doc);
  }
  updateTag(GREETINGS_TAG);
  redirect(`/admin/greetings?saved=${encodeURIComponent(d.message)}`);
}

/** Takes a greeting down now. It stays in the list as Ended and can be edited to run again. */
export async function stopGreeting(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await greetings()).updateOne({ _id: new ObjectId(id), stoppedAt: null }, { $set: { stoppedAt: new Date(), updatedAt: new Date() } });
  updateTag(GREETINGS_TAG);
  redirect("/admin/greetings?stopped=1");
}

export async function deleteGreeting(fd: FormData) {
  await requireAdmin();
  const id = String(fd.get("id") ?? "");
  if (!ObjectId.isValid(id)) return;
  await (await greetings()).deleteOne({ _id: new ObjectId(id) });
  updateTag(GREETINGS_TAG);
  redirect("/admin/greetings?deleted=1");
}
