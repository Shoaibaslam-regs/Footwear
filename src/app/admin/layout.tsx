import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import ActionToast from "@/components/ActionToast";
import ConfirmButton from "@/components/ConfirmButton";
import AdminNav, { AdminNavFallback } from "@/components/admin/AdminNav";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin — ÉLORA", template: "%s — ÉLORA Admin" },
  robots: { index: false, follow: false },
};

async function SignedInAs() {
  const user = await requireAdmin();
  return (
    <div className="flex items-center gap-3">
      <span className="muted hidden sm:inline">{user.email}</span>
      <form action={logout}>
        <ConfirmButton
          className="btn"
          confirm={{
            title: "Sign out?",
            message: "You will need to sign in again to manage the store.",
            confirmLabel: "Sign out",
            icon: "logout",
            variant: "admin",
          }}
        >
          Sign out
        </ConfirmButton>
      </form>
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="admin">
      <header className="bg-white border-b border-[var(--a-line)]">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <Link className="font-semibold" href="/admin">
              ÉLORA Admin
            </Link>
            <Suspense fallback={<AdminNavFallback />}>
              <AdminNav />
            </Suspense>
          </div>
          <div className="flex items-center gap-3">
            <Link className="link muted hidden sm:inline" href="/">
              View store
            </Link>
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Suspense fallback={<p className="muted">Loading…</p>}>{children}</Suspense>
      </main>
      <ActionToast />
    </div>
  );
}
