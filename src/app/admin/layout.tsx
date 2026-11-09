import type { Metadata } from "next";
import Image from "next/image";
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
    <div className="flex items-center gap-5">
      <span className="font-medium hidden sm:inline" title={user.email}>
        {user.name.split(" ")[0]}
      </span>
      <form action={logout}>
        <ConfirmButton
          className="btn btn-text"
          confirm={{
            title: "Log out?",
            message: "You will need to log in again to manage the store.",
            confirmLabel: "Log out",
            icon: "logout",
            variant: "admin",
          }}
        >
          Log out
        </ConfirmButton>
      </form>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="admin">
      <header className="a-topbar">
        <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link className="flex items-center gap-2 shrink-0" href="/admin">
              <Image
                alt=""
                className="w-6 h-6 object-contain"
                height={24}
                src="/icon.png"
                width={24}
              />
              <span className="a-brand">ÉLORA</span>
            </Link>
            <span aria-hidden="true" className="h-5 w-px bg-[var(--a-line)]" />
            <span className="muted">Admin</span>
            <Link
              className="link muted hidden md:inline ml-3 text-xs"
              href="/"
              target="_blank"
            >
              View store ↗
            </Link>
          </div>
          <Suspense fallback={null}>
            <SignedInAs />
          </Suspense>
        </div>
      </header>

      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] xl:grid-cols-[220px_minmax(0,1fr)] gap-4 md:gap-8">
        <aside className="md:sticky md:top-6 md:self-start">
          <Suspense fallback={<AdminNavFallback />}>
            <AdminNav />
          </Suspense>
        </aside>
        <main className="min-w-0">
          <Suspense fallback={<p className="muted">Loading…</p>}>
            {children}
          </Suspense>
        </main>
      </div>
      <ActionToast />
    </div>
  );
}
