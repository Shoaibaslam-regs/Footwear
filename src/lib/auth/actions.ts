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
import { checkCode, resendCode, startRegistration } from "../server/email-otp";
import { adminGateOn, gatePass, isAdminSecret, validGatePass } from "../server/admin-gate";

export type AuthState =
  | {
      errors?: Partial<Record<"name" | "email" | "password" | "confirm" | "code", string[]>>;
      message?: string;
      values?: { name?: string; email?: string };
      /** A rate limit was reached: seconds until the button works again. */
      retryAfter?: number;
      /** Sign-up step 2: a code was emailed to `email`. */
      step?: "verify";
      email?: string;
      /** The sign-up was lost (expired): show the form again. */
      restart?: boolean;
      /** Hidden admin login: the secret was entered; `gate` proves it to the next step. */
      admin?: boolean;
      gate?: string;
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

/** Creates the account and logs in. The very first account becomes the store administrator. */
async function createAccount(name: string, email: string, passwordHash: string, next: FormDataEntryValue | null, verified: boolean): Promise<AuthState> {
  const users = (await getDb()).collection<Omit<UserDoc, "_id"> & { emailVerifiedAt?: Date }>("users");
  const role = (await users.estimatedDocumentCount()) === 0 ? "admin" : "customer";
  let id: string;
  try {
    const now = new Date();
    const res = await users.insertOne({ name, email, passwordHash, role, createdAt: now, ...(verified ? { emailVerifiedAt: now } : {}) });
    id = res.insertedId.toHexString();
  } catch (e) {
    if (e instanceof MongoServerError && e.code === 11000) {
      return { errors: { email: ["An account with this email already exists. Please log in."] }, values: { name, email } };
    }
    throw e;
  }
  await createSession({ sub: id, role });
  redirect(role === "admin" ? "/admin" : safeNext(next, "/account"));
}

/**
 * Sign-up, step 1. With email set up, no account is made yet: the details
 * wait while a 6-digit code goes to the address (lib/server/email-otp.ts).
 * Without email, the account is created straight away as before.
 */
export async function register(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData);
  const parsed = registerSchema.safeParse(raw);
  const values = { name: String(raw.name ?? ""), email: String(raw.email ?? "") };
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const registerWait = await hit(RULES.registerIp, await clientIp());
  if (registerWait) return { retryAfter: registerWait, values };

  const { name, email: address, password } = parsed.data;
  if (await (await getDb()).collection("users").findOne({ email: address }, { projection: { _id: 1 } })) {
    return { errors: { email: ["An account with this email already exists."] }, values };
  }
  const passwordHash = await hashPassword(password);
  if (!mailConfigured()) return createAccount(name, address, passwordHash, formData.get("next"), false);

  const started = await startRegistration(address, name, passwordHash);
  if (!started.ok) {
    return "retryAfter" in started ? { retryAfter: started.retryAfter, values } : { message: started.error, values };
  }
  return { step: "verify", email: address, values };
}

const codeSchema = z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code from the email.");

/** Sign-up, step 2: the code from the email. A right code creates the account and logs in. */
export async function verifyRegistration(_: AuthState, formData: FormData): Promise<AuthState> {
  const address = email.safeParse(formData.get("email") ?? "");
  if (!address.success) return { restart: true, message: "Please fill in the form again." };
  const code = codeSchema.safeParse(String(formData.get("code") ?? "").replace(/\s+/g, ""));
  if (!code.success) return { step: "verify", email: address.data, errors: { code: z.flattenError(code.error).formErrors } };
  const r = await checkCode(address.data, code.data);
  if (!r.ok) {
    if (r.expired) return { restart: true, message: r.error, values: { email: address.data } };
    return { step: "verify", email: address.data, message: r.error };
  }
  return createAccount(r.name, address.data, r.passwordHash, formData.get("next"), true);
}

/** "Resend code": a new code, at most once a minute and 5 times per sign-up. */
export async function resendRegistrationCode(raw: string): Promise<{ ok?: true; error?: string; retryAfter?: number }> {
  const address = email.safeParse(raw ?? "");
  if (!address.success) return { error: "Please fill in the form again." };
  const r = await resendCode(address.data);
  if (r.ok) return { ok: true };
  return "retryAfter" in r ? { retryAfter: r.retryAfter } : { error: r.error };
}

export async function login(_: AuthState, formData: FormData): Promise<AuthState> {
  const raw = Object.fromEntries(formData);
  const values = { email: String(raw.email ?? "") };
  const ip = await clientIp();

  // The hidden admin door: the secret typed into the email box. Anything else
  // that isn't an email counts as a guess, so the secret can't be brute-forced.
  if (adminGateOn() && !email.safeParse(values.email).success && values.email.trim()) {
    const gateWait = await blocked(RULES.adminGateIp, ip);
    if (gateWait) return { retryAfter: gateWait, values: { email: "" } };
    if (isAdminSecret(values.email)) return { admin: true, gate: await gatePass() };
    await hit(RULES.adminGateIp, ip);
  }

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  // Checked before the password, and the same answer whether or not the account exists.
  const wait = await firstBlocked([RULES.loginEmail, parsed.data.email], [RULES.loginIp, ip]);
  if (wait) return { retryAfter: wait, values };

  const db = await getDb();
  const user = await db.collection<UserDoc>("users").findOne({ email: parsed.data.email });
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  // With the admin door on, admin accounts can't log in here: same answer as a wrong password.
  if (!user || !ok || (user.role === "admin" && adminGateOn())) {
    // Only failed attempts count.
    await Promise.all([hit(RULES.loginEmail, parsed.data.email), hit(RULES.loginIp, ip)]);
    return { message: "Email or password is incorrect.", values };
  }

  await createSession({ sub: user._id.toHexString(), role: user.role });
  const fallback = user.role === "admin" ? "/admin" : "/account";
  redirect(safeNext(formData.get("next"), fallback));
}

/**
 * The admin login step behind the secret. Only admin accounts get in, with the
 * same per-email and per-IP limits as the normal login.
 */
export async function adminLogin(_: AuthState, formData: FormData): Promise<AuthState> {
  const gate = String(formData.get("gate") ?? "");
  if (!(await validGatePass(gate))) return { message: "This admin login has timed out. Please start again from the login page." };
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { admin: true, gate, errors: z.flattenError(parsed.error).fieldErrors, values };
  const ip = await clientIp();
  const wait = await firstBlocked([RULES.adminLoginIp, ip], [RULES.loginEmail, parsed.data.email], [RULES.loginIp, ip]);
  if (wait) return { admin: true, gate, retryAfter: wait, values };

  const user = await (await getDb()).collection<UserDoc>("users").findOne({ email: parsed.data.email });
  const ok = user ? await verifyPassword(parsed.data.password, user.passwordHash) : false;
  if (!user || !ok || user.role !== "admin") {
    await Promise.all([hit(RULES.adminLoginIp, ip), hit(RULES.loginEmail, parsed.data.email), hit(RULES.loginIp, ip)]);
    return { admin: true, gate, message: "Email or password is incorrect.", values };
  }
  await createSession({ sub: user._id.toHexString(), role: user.role });
  redirect("/admin");
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
