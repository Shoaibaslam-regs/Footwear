import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Log In — ÉLORA Maison",
  description: "Log in to your ÉLORA account.",
};

async function LoginForm({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
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
