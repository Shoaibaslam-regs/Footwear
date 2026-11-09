import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create Account — ÉLORA Maison",
  description: "Create your ÉLORA Maison client account.",
};

async function RegisterForm({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={typeof next === "string" ? next : undefined} />;
}

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <AuthShell
      eyebrow="Client Salon"
      intro="Join for early atelier access, saved sizes and faster checkout."
      title="Create Account"
    >
      <Suspense>
        <RegisterForm {...props} />
      </Suspense>
    </AuthShell>
  );
}
