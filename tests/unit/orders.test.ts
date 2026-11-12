import { describe, expect, it } from "vitest";
import { etaLabel, etaSentence, inQueue, nextStatuses, orderStatuses, queueStatuses } from "@/lib/orders";

describe("expected delivery labels (no year, as everywhere on the storefront)", () => {
  it("one day shows the weekday", () => {
    expect(etaLabel({ from: "2026-11-18", to: "2026-11-18" })).toBe("Wed 18 Nov");
  });
  it("a range in one month", () => {
    expect(etaLabel({ from: "2026-11-16", to: "2026-11-17" })).toBe("16–17 Nov");
  });
  it("a range across months", () => {
    expect(etaLabel({ from: "2026-11-30", to: "2026-12-02" })).toBe("30 Nov – 2 Dec");
  });
  it("the sentence used in emails and WhatsApp adds the reason", () => {
    expect(etaSentence({ from: "2026-11-16", to: "2026-11-17", note: "Many orders right now.", setAt: "" })).toBe(
      "Expected delivery: 16–17 Nov. Many orders right now.",
    );
  });
});

describe("fulfilment rules", () => {
  it("steps only go forward, one at a time", () => {
    expect(nextStatuses.pending).toEqual(["confirmed", "cancelled"]);
    expect(nextStatuses.confirmed).toEqual(["processing", "cancelled"]);
    expect(nextStatuses.processing).toEqual(["shipped", "cancelled"]);
    expect(nextStatuses.shipped).not.toContain("cancelled");
  });
  it("delivered and cancelled orders are final", () => {
    expect(nextStatuses.delivered).toEqual([]);
    expect(nextStatuses.cancelled).toEqual([]);
  });
  it("every status has rules", () => {
    for (const s of orderStatuses) expect(nextStatuses[s]).toBeDefined();
  });
  it("the queue holds only orders still to be sent", () => {
    expect(queueStatuses).toEqual(["pending", "confirmed", "processing"]);
    expect(inQueue("pending")).toBe(true);
    expect(inQueue("shipped")).toBe(false);
    expect(inQueue("delivered")).toBe(false);
  });
});
