import { Suspense } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth/dal";
import { listGreetingsNow } from "@/lib/server/greetings";
import { greetingState, greetingStyleLabel, liveGreeting, type GreetingState } from "@/lib/greetings";
import { saleTime } from "@/lib/sale-events";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { deleteGreeting, stopGreeting } from "./actions";

export const metadata = { title: "Greetings" };

const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);

const stateTag: Record<GreetingState, [string, string]> = {
  live: ["tag-ok", "Showing"],
  scheduled: ["tag-info", "Scheduled"],
  ended: ["tag-muted", "Ended"],
};

async function AdminGreetingsContent({ searchParams }: PageProps<"/admin/greetings">) {
  await requireAdmin();
  const [{ rows, now }, sp] = await Promise.all([listGreetingsNow(), searchParams]);
  const showing = liveGreeting(rows.filter((g) => !g.stoppedAt), now);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1>Greetings</h1>
          <p className="muted">
            Festive wishes like Eid Mubarak or Ramadan Kareem, on the hanging plaque at the top of the home page. They show and hide by themselves
            on the dates you set. During a sale, the greeting sits on a small gold scroll above the sale plaque.
          </p>
        </div>
        <Link className="btn btn-primary" href="/admin/greetings/new">
          New greeting
        </Link>
      </div>

      {one(sp.saved) && (
        <p className="notice notice-ok" role="status">
          Saved {one(sp.saved)}.
        </p>
      )}
      {one(sp.stopped) && (
        <p className="notice notice-ok" role="status">
          Greeting taken down.
        </p>
      )}
      {one(sp.deleted) && (
        <p className="notice notice-ok" role="status">
          Greeting deleted.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="empty">
          No greetings yet
          <span className="muted">Create one with &ldquo;New greeting&rdquo;, e.g. Eid Mubarak for the three days of Eid.</span>
        </div>
      ) : (
        <div className="panel overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Greeting</th>
                <th>Occasion</th>
                <th>When (Pakistan time)</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => {
                const state = greetingState(g, now);
                const [tagClass, text] = stateTag[state];
                const hidden = state === "live" && showing?.id !== g.id;
                return (
                  <tr key={g.id}>
                    <td>
                      <Link className="link font-semibold" href={`/admin/greetings/${g.id}`}>
                        {g.message}
                      </Link>
                      {g.line && <div className="muted text-xs max-w-[22rem] truncate">{g.line}</div>}
                    </td>
                    <td className="whitespace-nowrap">{greetingStyleLabel[g.style].replace(/ \(.*\)$/, "")}</td>
                    <td className="whitespace-nowrap">
                      {saleTime(g.startsAt)} →<br />
                      {saleTime(g.stoppedAt ?? g.endsAt)}
                      {g.stoppedAt && <div className="muted text-xs">Taken down early</div>}
                    </td>
                    <td>
                      <span className={`tag ${tagClass}`}>{text}</span>
                      {hidden && <div className="muted text-xs">A newer greeting shows instead</div>}
                    </td>
                    <td className="text-right whitespace-nowrap">
                      <div className="inline-flex gap-2">
                        <Link className="btn btn-sm" href={`/admin/greetings/${g.id}`}>
                          Edit
                        </Link>
                        {state !== "ended" && (
                          <form action={stopGreeting}>
                            <input name="id" type="hidden" value={g.id} />
                            <ConfirmButton className="btn btn-sm" confirmLabel="Take down" message="It disappears from the home page straight away." title={`Take down ${g.message}?`}>
                              Take down
                            </ConfirmButton>
                          </form>
                        )}
                        <form action={deleteGreeting}>
                          <input name="id" type="hidden" value={g.id} />
                          <ConfirmButton className="btn btn-sm btn-danger" title={`Delete ${g.message}?`}>
                            Delete
                          </ConfirmButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function AdminGreetingsPage(props: PageProps<"/admin/greetings">) {
  return (
    <Suspense fallback={<p className="muted">Loading…</p>}>
      <AdminGreetingsContent {...props} />
    </Suspense>
  );
}
