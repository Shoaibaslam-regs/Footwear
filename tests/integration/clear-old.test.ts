import { beforeEach, describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/server/db";
import { finishedOlderThan, oldOrderCounts } from "@/lib/server/orders";
import { clearMailLog, mailLogCounts } from "@/lib/server/mail-log";
import { resetDb } from "../setup/integration";

beforeEach(resetDb);
const DAY = 86_400_000;
const now = Date.parse("2026-11-17T08:00:00Z");
const ago = (days: number) => new Date(now - days * DAY);

describe("Clear old orders", () => {
  it("matches only finished orders (cancelled, or delivered and paid) older than the cut-off", async () => {
    const order = (n: string, days: number, status: string, payment = "pending") => ({
      _id: new ObjectId(), number: n, status, payment: { status: payment }, createdAt: ago(days),
    });
    await (await getDb()).collection("orders").insertMany([
      order("EL-OLD-CANCEL", 45, "cancelled"),
      order("EL-OLD-PAID", 70, "delivered", "paid"),
      order("EL-OLD-UNPAID", 70, "delivered", "pending"), // money still to collect: kept
      order("EL-OLD-OPEN", 90, "processing"), // still in progress: kept
      order("EL-NEW-CANCEL", 10, "cancelled"), // too recent: kept
    ]);
    const found = async (days: number) =>
      (await (await getDb()).collection("orders").find(finishedOlderThan(days, now)).toArray()).map((o) => o.number).sort();
    expect(await found(30)).toEqual(["EL-OLD-CANCEL", "EL-OLD-PAID"]);
    expect(await found(60)).toEqual(["EL-OLD-PAID"]);
    expect(await oldOrderCounts(now)).toEqual({ 30: 2, 60: 1 });
  });
});

describe("Clear email history", () => {
  it("deletes rows older than 30 or 60 days, or all of them", async () => {
    const row = (days: number) => ({ kind: "shipped", to: "a@b.c", subject: "s", ok: true, at: ago(days), expiresAt: new Date(now + 400 * DAY) });
    const log = (await getDb()).collection("mail_log");
    await log.insertMany([row(1), row(40), row(45), row(90)]);
    expect(await mailLogCounts(now)).toEqual({ 30: 3, 60: 1, all: 4 });
    expect(await clearMailLog(60, now)).toBe(1);
    expect(await clearMailLog(30, now)).toBe(2);
    expect(await log.countDocuments()).toBe(1);
    expect(await clearMailLog(null, now)).toBe(1);
    expect(await log.countDocuments()).toBe(0);
  });
});
