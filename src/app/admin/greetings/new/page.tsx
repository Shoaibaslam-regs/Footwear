import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import GreetingForm from "@/components/admin/GreetingForm";

export const metadata = { title: "New greeting" };

async function NewGreetingContent() {
  await requireAdmin();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/greetings">
          ← Greetings
        </Link>
        <h1 className="mt-1">New greeting</h1>
      </div>
      <GreetingForm />
    </div>
  );
}

export default function NewGreetingPage() {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <NewGreetingContent />
    </Suspense>
  );
}
