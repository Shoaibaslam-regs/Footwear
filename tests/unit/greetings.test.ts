import { describe, expect, it } from "vitest";
import { greetingState, isShopLink, liveGreeting, nextGreetingChange, plaqueMotif, type Greeting } from "@/lib/greetings";

const g = (id: string, start: string, end: string, created: string, stopped: string | null = null): Greeting => ({
  id, message: id, line: "", style: "eid", linkLabel: "", linkHref: "", startsAt: start, endsAt: end, stoppedAt: stopped, createdAt: created,
});
const now = Date.parse("2026-03-21T10:00:00Z");

describe("greetings", () => {
  it("is live only between its dates, and not once taken down", () => {
    expect(greetingState(g("a", "2026-03-20T00:00:00Z", "2026-03-23T00:00:00Z", "2026-03-01T00:00:00Z"), now)).toBe("live");
    expect(greetingState(g("b", "2026-03-22T00:00:00Z", "2026-03-23T00:00:00Z", "2026-03-01T00:00:00Z"), now)).toBe("scheduled");
    expect(greetingState(g("c", "2026-03-01T00:00:00Z", "2026-03-02T00:00:00Z", "2026-03-01T00:00:00Z"), now)).toBe("ended");
    expect(greetingState(g("d", "2026-03-20T00:00:00Z", "2026-03-23T00:00:00Z", "2026-03-01T00:00:00Z", "2026-03-21T09:00:00Z"), now)).toBe("ended");
  });

  it("shows one at a time: the newest live one", () => {
    const old = g("eid", "2026-03-19T00:00:00Z", "2026-03-24T00:00:00Z", "2026-03-01T00:00:00Z");
    const newer = g("jumma", "2026-03-20T00:00:00Z", "2026-03-22T00:00:00Z", "2026-03-10T00:00:00Z");
    expect(liveGreeting([old, newer], now)?.id).toBe("jumma");
    expect(liveGreeting([old], Date.parse("2026-03-25T00:00:00Z"))).toBeNull();
  });

  it("knows when the next one starts or ends, so the page switches on time", () => {
    const list = [g("a", "2026-03-20T00:00:00Z", "2026-03-23T00:00:00Z", "x"), g("b", "2026-03-22T00:00:00Z", "2026-03-25T00:00:00Z", "x")];
    expect(nextGreetingChange(list, now)).toBe(Date.parse("2026-03-22T00:00:00Z"));
  });

  it("links only to pages of the shop", () => {
    expect(isShopLink("/collections")).toBe(true);
    expect(isShopLink("/collections?category=bridal")).toBe(true);
    for (const bad of ["https://evil.example", "//evil.example", "javascript:alert(1)", "collections"]) expect(isShopLink(bad)).toBe(false);
  });

  it("picks what falls: the greeting's motif, unless it is None, then the sale's", () => {
    expect(plaqueMotif("eid", "winter")).toBe("eid");
    expect(plaqueMotif("none", "winter")).toBe("winter");
    expect(plaqueMotif("none", "none")).toBe("none");
    expect(plaqueMotif("none", undefined)).toBe("none"); // greeting alone, set to None
    expect(plaqueMotif(undefined, "spring")).toBe("spring"); // sale alone
  });
});
