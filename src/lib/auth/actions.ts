"use server";

import { MongoServerError } from "mongodb";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getDb } from "../server/db";
import { hashPassword, verifyPassword } from "../server/password";
import type { UserDoc } from "./dal";
import { createSession, deleteSession } from "./session";
import { mailConfigured, sendMail, siteUrl } from "../server/mail";
import { createResetToken, consumeResetToken } from "../server/password-reset";
import { RULES, blocked, clientIp, firstBlocked, hit } from "../server/rate-limit";

export type AuthState =
  | {
      errors?: Partial<Record<"name" | "email" | "password" | "confirm", string[]>>;
      message?: string;
      values?: { name?: string; email?: string };
      /** A rate limit was reached: seconds until the button works again. */
      retryAfter?: number;
    }
  | undefined;

const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Enter a valid email address.").max(254));

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
    email,
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128)
      .regex(/[a-zA-Z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password."),
});

/** Only allow same-site relative redirects. */
function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const v = typeof value === "string" ? value : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : fallback;
}

export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const registerWait = await hit(RULES.registerIp, await clientIp());
  if (registerWait) return { retryAfter: registerWait, values };

  const db = await getDb();
  const users = db.collection<Omit<UserDoc, "_id">>("users");
  // The very first account becomes the store administrator.
  const role = (await users.estimatedDocumentCount()) === 0 ? "admin" : "customer";

  let id: string;
  try {
    const res = await users.insertOne({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
      role,
      createdAt: new Date(),
    });
    id = res.insertedId.toHexString();
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) {
      return { errors: { email: ["An account with this email already exists."] }, values };
    }
    throw e;
  }

  await createSession({ sub: id, role });
  redirect(role === "admin" ? "/admin" : safeNext(formData.get("next"), "/account"));
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData);
  const values = { email: String(raw.email ?? "") };
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  // Checked before the password, and the same answer whether or not the account exists.
  const ip = await clientIp();
  const wait = await firstBlocked([RULES.loginEmail, parsed.data.email], [RULES.loginIp, ip]);
  if (wait) return { retryAfter: wait, values };

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email: parsed.data.email });
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok) {
    // Only failed attempts count.
    await Promise.all([hit(RULES.loginEmail, parsed.data.email), hit(RULES.loginIp, ip)]);
    return { message: "Email or password is incorrect.", values };
  }

  await createSession({ sub: user._id.toHexString(), role: user.role });
  const fallback = user.role === "admin" ? "/admin" : "/account";
  redirect(safeNext(formData.get("next"), fallback));
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}

/* ---------- Password reset ---------- */

export type ResetState = { ok?: string; message?: string; errors?: Record<string, string[] | undefined>; retryAfter?: number } | undefined;

export async function requestPasswordReset(_: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = email.safeParse(formData.get("email") ?? "");
  if (!parsed.success) return { errors: { email: ["Enter a valid email address."] } };
  if (!mailConfigured()) {
    return {
      message:
        "Email isn't set up for this store yet. Please message us on WhatsApp (0314 8428115) from your registered number and we'll send you a reset link.",
    };
  }
  const ipWait = await hit(RULES.resetIp, await clientIp());
  if (ipWait) return { retryAfter: ipWait };
  // Per address the cap is silent: the answer below stays the same, so it can't
  // reveal which emails have accounts, and the inbox gets at most 3 emails an hour.
  const overForEmail = (await hit(RULES.resetEmail, parsed.data)) !== null;
  const db = await getDb();
  const user = overForEmail ? null : await db.collection<UserDoc>("users").findOne({ email: parsed.data });
  if (user) {
    const token = await createResetToken(user._id);
    if (token) {
      const link = `${await siteUrl()}/reset-password?token=${token}`;
      await sendMail(user.email, "Reset your Ŕose Atelier password", "Reset your password", [
        `Hello ${user.name.split(" ")[0]}, we received a request to reset your password.`,
        "This link works once and expires in 1 hour. If you didn't ask for it, you can ignore this email.",
      ], { label: "Choose a new password", href: link });
    }
  }
  // Same answer whether or not the account exists.
  return { ok: "If an account exists for that email, we've sent a reset link. Check your inbox and spam folder." };
}

const newPassword = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(128)
      .regex(/[a-zA-Z]/, "Include at least one letter.")
      .regex(/[0-9]/, "Include at least one number."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords do not match." });

export async function resetPassword(_: ResetState, formData: FormData): Promise<ResetState> {
  const parsed = newPassword.safeParse({ password: formData.get("password") ?? "", confirm: formData.get("confirm") ?? "" });
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors };
  const ip = await clientIp();
  const wait = await blocked(RULES.resetTokenIp, ip);
  if (wait) return { retryAfter: wait };
  const userId = await consumeResetToken(String(formData.get("token") ?? ""));
  if (!userId) {
    await hit(RULES.resetTokenIp, ip);
    return { message: "This reset link has expired or was already used. Please request a new one." };
  }
  const db = await getDb();
  const users = db.collection<UserDoc>("users");
  const now = new Date();
  await users.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(parsed.data.password), passwordChangedAt: now } });
  const user = await users.findOne({ _id: userId });
  if (!user) return { message: "Account not found." };
  await createSession({ sub: user._id.toHexString(), role: user.role });
  redirect(user.role === "admin" ? "/admin" : "/account?reset=1");
}
