import { describe, expect, it } from "vitest";
import { cardLabel } from "@/lib/products";

describe("card label (one per card)", () => {
  it("the admin's badge wins, then Best Seller, then New, else none", () => {
    expect(cardLabel({ badge: "Bridal Edit", bestSeller: true, newArrival: true })).toBe("Bridal Edit");
    expect(cardLabel({ badge: "  ", bestSeller: true, newArrival: true })).toBe("Best Seller");
    expect(cardLabel({ badge: "", bestSeller: false, newArrival: true })).toBe("New");
    expect(cardLabel({ badge: "", bestSeller: false, newArrival: false })).toBe("");
  });
});
