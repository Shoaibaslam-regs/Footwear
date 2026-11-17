import { beforeEach, describe, expect, it } from "vitest";
import { getDb } from "@/lib/server/db";
import { countMail, listMail, mailStats, recordMail } from "@/lib/server/mail-log";
import { resetDb } from "../setup/integration";

beforeEach(resetDb);
const log = async () => (await getDb()).collection("mail_log");

describe("email log (admin Emails page)", () => {
  it("records each send, without the one-time code from the subject", async () => {
    await recordMail("signup_code", " Sana@Example.com ", "123456 is your R'ose Atelier code", true);
    await recordMail("shipped", "nadia@example.com", "Order #EL-100001 is on its way — R'ose Atelier", false, "550 mailbox unavailable");
    const { rows } = await listMail({ skip: 0, limit: 25 });
    expect(rows.map((r) => [r.kind, r.to, r.subject, r.ok, r.error])).toEqual([
      ["shipped", "nadia@example.com", "Order #EL-100001 is on its way — R'ose Atelier", false, "550 mailbox unavailable"],
      ["signup_code", "sana@example.com", "•••••• is your R'ose Atelier code", true, null],
    ]);
    expect(await countMail({ failed: true })).toBe(1);
    expect(await countMail({ kind: "signup_code" })).toBe(1);
  });

  it("counts by Pakistan day, by type, and against the period before", async () => {
    // 2026-11-16 10:00 in Karachi (05:00 UTC).
    const now = Date.parse("2026-11-16T05:00:00Z");
    const at = (iso: string) => new Date(iso);
    const doc = (kind: string, iso: string, ok = true) => ({ kind, to: "a@b.c", subject: "s", ok, at: at(iso), expiresAt: new Date(now + 86_400_000) });
    await (await log()).insertMany([
      doc("signup_code", "2026-11-15T19:30:00Z"), // 00:30 on the 16th in Karachi: today
      doc("shipped", "2026-11-16T04:00:00Z"),
      doc("shipped", "2026-11-16T04:30:00Z", false),
      doc("password_reset", "2026-11-15T18:30:00Z"), // 23:30 on the 15th in Karachi: yesterday
      doc("back_in_stock", "2026-11-05T10:00:00Z"),
      doc("shipped", "2026-10-01T10:00:00Z"), // the 30 days before
    ]);
    const s = await mailStats(now);
    expect(s.today).toEqual({ sent: 2, failed: 1 });
    expect(s.week).toEqual({ now: 3, before: 1 }); // 5 Nov is in the 7 days before
    expect(s.month).toEqual({ now: 4, before: 1 });
    expect(s.failedMonth).toEqual({ now: 1, before: 0 });
    expect(s.byKind.find((k) => k.kind === "shipped")).toEqual({ kind: "shipped", sent: 1, failed: 1 });
    expect(s.daily).toHaveLength(30);
    expect(s.daily.at(-1)).toEqual({ day: "2026-11-16", value: 2 });
    expect(s.daily.at(-2)).toEqual({ day: "2026-11-15", value: 1 });
  });
});
