import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import AuthShell from "@/components/auth/AuthShell";
import { ResetPasswordForm } from "@/components/auth/ResetForms";
import { peekResetToken } from "@/lib/server/password-reset";

export const metadata: Metadata = { title: "Choose a New Password — ÉLORA Maison", robots: { index: false } };

async function ResetBody({ searchParams }: PageProps<"/reset-password">) {
  await connection(); // token expiry is checked against the current time, so never prerender
  const { token } = await searchParams;
  const value = typeof token === "string" ? token : "";
  if (!(await peekResetToken(value))) {
    return (
      <div className="flex flex-col gap-space-md">
        <p className="font-body-md text-body-md text-on-surface-variant">This reset link has expired or was already used.</p>
        <Link className="h-[52px] rounded-full bg-primary text-on-primary font-label-uppercase text-label-uppercase uppercase tracking-widest flex items-center justify-center" href="/forgot-password">
          Request a New Link
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm token={value} />;
}

export default function ResetPasswordPage(props: PageProps<"/reset-password">) {
  return (
    <AuthShell eyebrow="Account Help" intro="Choose a new password. You will be logged out on your other devices." title="New Password">
      <Suspense>
        <ResetBody {...props} />
      </Suspense>
    </AuthShell>
  );
}
