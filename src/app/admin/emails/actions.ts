"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { clearMailLog } from "@/lib/server/mail-log";

/** "Delete older than 30 / 60 days" or "Delete all" on the Emails page. Only the history goes; nothing is unsent. */
export async function clearEmailHistory(formData: FormData) {
  await requireAdmin();
  const range = String(formData.get("range") ?? "");
  if (range !== "30" && range !== "60" && range !== "all") redirect("/admin/emails");
  const n = await clearMailLog(range === "all" ? null : Number(range));
  redirect(`/admin/emails?cleared=${n}`);
}
