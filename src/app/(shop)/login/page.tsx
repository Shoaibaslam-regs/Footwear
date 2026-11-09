import type { Metadata } from "next";
import { Suspense } from "react";
import AuthForm from "@/components/auth/AuthForm";
import AuthShell from "@/components/auth/AuthShell";

export const metadata: Metadata = {
  title: "Sign In — ÉLORA Maison",
  description: "Sign in to your ÉLORA Maison client account.",
};

async function LoginForm({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <AuthShell
      eyebrow="Welcome Back"
      intro="Sign in to view your orders, wishlist and private appointments."
      title="Sign In"
    >
      <Suspense>
        <LoginForm {...props} />
      </Suspense>
    </AuthShell>
  );
}
