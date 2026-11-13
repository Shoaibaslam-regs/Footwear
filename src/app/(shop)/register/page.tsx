import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Create Account — Ŕose Atelier",
  description: "Create your free Ŕose Atelier account.",
};

async function RegisterForm({ searchParams }: PageProps<"/register">) {
  const { next } = await searchParams;
  // Already logged in (checked against the database, not just the cookie): go on.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : safeNextPath(next, "/account"));
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
