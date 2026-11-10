import type { Metadata } from "next";
import AuthShell from "@/components/auth/AuthShell";
import { ForgotPasswordForm } from "@/components/auth/ResetForms";

export const metadata: Metadata = { title: "Forgot Password — Ŕose Atelier" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Account Help" intro="Enter your account email and we'll send you a link to choose a new password." title="Forgot Password">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
