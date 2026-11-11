import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/dal";
import { logout } from "@/lib/auth/actions";
import ActionToast from "@/components/ActionToast";
import ConfirmButton from "@/components/ConfirmButton";
import AdminNav, { AdminNavFallback } from "@/components/admin/AdminNav";
import LiveOrders from "@/components/admin/LiveOrders";
import "./admin.css";

export const metadata: Metadata = {
  title: { default: "Admin — Ŕose Atelier", template: "%s — Ŕose Atelier Admin" },
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
      <header className="a-topbar sticky top-0 z-40">
        <div className="px-3 sm:px-4 h-12 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link className="flex items-center gap-2.5 shrink-0" href="/admin">
              <span className="a-appicon">
                <Image alt="" className="w-5 h-5 object-contain" height={20} src="/icon.png" width={20} />
              </span>
              <span className="a-brand">Ŕose Atelier</span>
            </Link>
            <span aria-hidden="true" className="h-4 w-px bg-white/40" />
            <span className="font-semibold">Admin</span>
            <Link className="link muted hidden md:inline ml-2 text-xs" href="/" target="_blank">
              View store ↗
            </Link>
          </div>
          <div className="flex items-center gap-5">
            {/* Reads the pathname, so it streams in its own Suspense. */}
            <Suspense fallback={null}>
              <LiveOrders />
            </Suspense>
            <Suspense fallback={null}>
              <SignedInAs />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] min-h-[calc(100vh-48px)]">
        <aside className="a-pane px-2 py-2 md:py-3">
          <div className="md:sticky md:top-[60px]">
            <Suspense fallback={<AdminNavFallback />}>
              <AdminNav />
            </Suspense>
          </div>
        </aside>
        <main className="min-w-0 max-w-[1800px] w-full px-4 sm:px-6 lg:px-8 py-5 md:py-6">
          <Suspense fallback={<p className="muted">Loading…</p>}>
            {children}
          </Suspense>
        </main>
      </div>
      <ActionToast />
    </div>
  );
}
