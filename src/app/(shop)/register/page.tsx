import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Create Account — Ŕose Atelier",
  description: "Create your free Ŕose Atelier account.",
};

async function RegisterForm({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  return <AuthForm mode="register" next={typeof next === "string" ? next : undefined} />;
}

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <AuthShell
      eyebrow="Account"
      intro="Create a free account to save your favourites, track orders and check out faster."
      title="Create Account"
    >
      <Suspense>
        <RegisterForm {...props} />
      </Suspense>
    </AuthShell>
  );
}
