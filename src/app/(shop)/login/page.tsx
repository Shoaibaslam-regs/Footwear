import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { safeNextPath } from "@/lib/safe-next";

export const metadata: Metadata = {
  title: "Log In — Ŕose Atelier",
  description: "Log in to your Ŕose Atelier account.",
};

async function LoginForm({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  // Already logged in (checked against the database, not just the cookie): go on.
  const user = await getCurrentUser();
  if (user) redirect(user.role === "admin" ? "/admin" : safeNextPath(next, "/account"));
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthShell
      eyebrow="Welcome Back"
      intro="Log in to see your orders and wishlist."
      title="Log In"
    >
      <Suspense>
        <LoginForm {...props} />
      </Suspense>
    </AuthShell>
  );
}
