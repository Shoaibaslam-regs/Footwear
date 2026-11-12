import { describe, expect, it } from "vitest";
import { clock, tryAgainIn } from "@/lib/use-cooldown";

describe("countdown text on locked buttons", () => {
  it("minutes and seconds", () => {
    expect(clock(0)).toBe("0:00");
    expect(clock(59)).toBe("0:59");
    expect(clock(14 * 60 + 32)).toBe("14:32");
  });
  it("hours", () => {
    expect(clock(3_725)).toBe("1:02:05");
  });
  it("button label", () => {
    expect(tryAgainIn(890)).toBe("Try again in 14:50");
  });
});
