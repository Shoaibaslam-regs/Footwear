import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/dal";
import { getGreeting } from "@/lib/server/greetings";
import GreetingForm from "@/components/admin/GreetingForm";

export const metadata = { title: "Edit greeting" };

async function EditGreetingContent({ params }: PageProps<"/admin/greetings/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const greeting = await getGreeting(id);
  if (!greeting) notFound();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link className="link muted" href="/admin/greetings">
          ← Greetings
        </Link>
        <h1 className="mt-1">Edit {greeting.message}</h1>
      </div>
      {greeting.stoppedAt && (
        <p className="notice" role="status">
          This greeting was taken down. Set the dates and save to show it again.
        </p>
      )}
      <GreetingForm greeting={greeting} />
    </div>
  );
}

export default function EditGreetingPage(props: PageProps<"/admin/greetings/[id]">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <EditGreetingContent {...props} />
    </Suspense>
  );
}
