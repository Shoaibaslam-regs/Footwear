import { Suspense } from "react";
import Link from "next/link";
import { io } from "next/cache";
import { requireAdmin } from "@/lib/auth/dal";
import { mailConfigured } from "@/lib/server/mail";
import { DAILY_LIMIT, MAIL_KINDS, countMail, isMailKind, listMail, mailLogCounts, mailStats } from "@/lib/server/mail-log";
import ClearOlder from "@/components/admin/ClearOlder";
import { clearEmailHistory } from "./actions";
import StatTile from "@/components/admin/charts/StatTile";
import ChartCard from "@/components/admin/charts/ChartCard";
import ColumnChart from "@/components/admin/charts/ColumnChart";
import { shortDay } from "@/components/admin/charts/scale";
import Pager, { pageOf, withParams } from "@/components/admin/Pager";

export const metadata = { title: "Emails" };

const n = (v: number) => v.toLocaleString("en-US");
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Karachi" });

async function EmailsContent({ searchParams }: PageProps<"/admin/emails">) {
  await requireAdmin();
  const sp = await searchParams;
  await io(); // the figures count days back from now
  const kind = isMailKind(sp.kind) ? sp.kind : undefined;
  const failed = sp.status === "failed";
  const [stats, total, old] = await Promise.all([mailStats(), countMail({ kind, failed }), mailLogCounts()]);
  const cleared = typeof sp.cleared === "string" ? Number(sp.cleared) : null;
  const { from, per } = pageOf(sp, total);
  const { rows } = await listMail({ kind, failed, skip: from, limit: per });
  const usedToday = Math.min(100, Math.round((stats.today.sent / DAILY_LIMIT) * 100));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1>Emails</h1>
        <p className="muted">
          Every email the store sends: sign-up codes, &quot;on its way&quot; emails, password resets and back-in-stock alerts. Days are Pakistan time.
        </p>
      </div>

      {cleared !== null && (
        <p className="notice notice-ok" role="status">
          {cleared === 0 ? "Nothing to delete." : `Deleted ${n(cleared)} ${cleared === 1 ? "email" : "emails"} from the history.`}
        </p>
      )}

      {!mailConfigured() && (
        <p className="notice notice-bad" role="status">
          Email is not set up, so nothing is being sent. Customers sign up without a code; use the WhatsApp buttons to reach them.
        </p>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="panel p-4 flex flex-col gap-1">
          <span className="muted text-[13px]">Sent today</span>
          <span className="text-lg sm:text-2xl font-semibold tracking-tight">
            {n(stats.today.sent)} <span className="text-sm font-normal muted">/ {DAILY_LIMIT}</span>
          </span>
          <span
            aria-label={`${usedToday}% of the daily limit used`}
            className="block h-1.5 rounded-full bg-[var(--a-grid)] overflow-hidden"
            role="img"
          >
            <span
              className={`block h-full rounded-full ${usedToday >= 90 ? "bg-[var(--a-danger)]" : "bg-[var(--a-chart)]"}`}
              style={{ width: `${usedToday}%` }}
            />
          </span>
          <span className="muted text-xs">Brevo&apos;s free plan sends {DAILY_LIMIT} a day</span>
        </div>
        <StatTile before={stats.week.before} label="Sent, last 7 days" now={stats.week.now} period="7 days" value={n(stats.week.now)} />
        <StatTile before={stats.month.before} label="Sent, last 30 days" now={stats.month.now} period="30 days" value={n(stats.month.now)} />
        <StatTile
          before={stats.failedMonth.before}
          goodWhenUp={false}
          href="/admin/emails?status=failed"
          label="Failed, last 30 days"
          now={stats.failedMonth.now}
          period="30 days"
          value={n(stats.failedMonth.now)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3">
        <ChartCard
          className="xl:col-span-2"
          subtitle={`Emails delivered to the mail server per day, last 30 days. ${n(stats.year)} in the last 12 months.`}
          table={{ head: ["Day", "Sent"], rows: [...stats.daily].reverse().map((p) => [shortDay(p.day), n(p.value)]) }}
          title="Emails per day"
        >
          <ColumnChart label="Emails" points={stats.daily} unit="count" />
        </ChartCard>
        <section className="panel">
          <div className="px-4 py-3 border-b border-[var(--a-line)]">
            <h2>By type</h2>
            <p className="muted text-[13px]">Last 30 days.</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th className="text-right">Sent</th>
                <th className="text-right">Failed</th>
              </tr>
            </thead>
            <tbody>
              {stats.byKind.map((k) => (
                <tr key={k.kind}>
                  <td>
                    <Link className="link" href={`/admin/emails?kind=${k.kind}`}>
                      {MAIL_KINDS[k.kind]}
                    </Link>
                  </td>
                  <td className="text-right tabular-nums">{n(k.sent)}</td>
                  <td className={`text-right tabular-nums ${k.failed > 0 ? "text-[var(--a-danger)] font-semibold" : "muted"}`}>{n(k.failed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="panel">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-[var(--a-line)]">
          <h2>Sent emails</h2>
          <div className="flex flex-wrap items-center gap-2 min-w-0 max-w-full">
            {/* Phones: the type row scrolls sideways inside the card. */}
            <nav aria-label="Type" className="a-seg max-w-full overflow-x-auto [scrollbar-width:none] [&>a]:whitespace-nowrap [&>a]:shrink-0">
              <Link aria-current={!kind ? "page" : undefined} className="pill" href={withParams("/admin/emails", sp, { kind: undefined, page: undefined })}>
                All
              </Link>
              {(Object.keys(MAIL_KINDS) as (keyof typeof MAIL_KINDS)[]).map((k) => (
                <Link key={k} aria-current={kind === k ? "page" : undefined} className="pill" href={withParams("/admin/emails", sp, { kind: k, page: undefined })}>
                  {MAIL_KINDS[k]}
                </Link>
              ))}
            </nav>
            <nav aria-label="Status" className="a-seg">
              <Link aria-current={!failed ? "page" : undefined} className="pill" href={withParams("/admin/emails", sp, { status: undefined, page: undefined })}>
                Any status
              </Link>
              <Link aria-current={failed ? "page" : undefined} className="pill" href={withParams("/admin/emails", sp, { status: "failed", page: undefined })}>
                Failed
              </Link>
            </nav>
          </div>
        </div>
        {rows.length === 0 ? (
          <p className="muted px-4 py-8 text-center">{kind || failed ? "No emails match these filters." : "No emails sent yet."}</p>
        ) : (
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>To</th>
                  <th>Subject</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="whitespace-nowrap muted">{when(r.at)}</td>
                    <td className="whitespace-nowrap">{MAIL_KINDS[r.kind] ?? r.kind}</td>
                    <td className="max-w-[16rem] truncate" title={r.to}>
                      {r.to}
                    </td>
                    <td className="max-w-[24rem] truncate" title={r.subject}>
                      {r.subject}
                    </td>
                    <td>
                      {r.ok ? (
                        <span className="tag tag-ok">Sent</span>
                      ) : (
                        <span className="tag tag-bad" title={r.error ?? undefined}>
                          Failed
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="px-4 py-3">
          <Pager noun={["email", "emails"]} path="/admin/emails" sp={sp} total={total} />
        </div>
      </section>

      <ClearOlder
        action={clearEmailHistory}
        choices={[
          {
            value: "30",
            label: "Older than 30 days",
            count: old[30],
            title: `Delete ${n(old[30])} emails older than 30 days?`,
            message: "Only the history goes: the emails were already sent. The counts above will no longer include them.",
          },
          {
            value: "60",
            label: "Older than 60 days",
            count: old[60],
            title: `Delete ${n(old[60])} emails older than 60 days?`,
            message: "Only the history goes: the emails were already sent. The counts above will no longer include them.",
          },
          {
            value: "all",
            label: "Delete all",
            count: old.all,
            title: `Delete all ${n(old.all)} emails from the history?`,
            message: "The list and every count on this page start again from zero. The emails themselves were already sent. This cannot be undone.",
          },
        ]}
        heading="Clear history"
        name="range"
        note="Remove old entries from this list. Emails already sent are not affected."
      />

      <p className="muted text-xs">
        &quot;Sent&quot; means Brevo accepted the email. Whether it reached the inbox or spam is shown in Brevo (Transactional → Logs). The list keeps about a year.
      </p>
    </div>
  );
}

export default function EmailsPage(props: PageProps<"/admin/emails">) {
  return (
    <Suspense fallback={null}>
      <EmailsContent {...props} />
    </Suspense>
  );
}
