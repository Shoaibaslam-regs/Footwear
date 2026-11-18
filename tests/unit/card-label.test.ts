import { describe, expect, it } from "vitest";
import { CARD_LABELS, cardLabel, listedLabel } from "@/lib/products";

describe("card labels", () => {
  it("only labels on the fixed list are shown, in the list's spelling", () => {
    expect(listedLabel("best seller")).toBe("Best Seller");
    expect(listedLabel(" Last Pairs ")).toBe("Last Pairs");
    for (const old of ["Trending", "#1 Best Seller", "Classic", "Atelier Knot", ""]) expect(listedLabel(old)).toBeNull();
    expect(CARD_LABELS).not.toContain("Trending");
  });

  it("falls back to the ticked flags, never to an invented label", () => {
    expect(cardLabel({ badge: "Restocked", bestSeller: true, newArrival: true })).toBe("Restocked");
    expect(cardLabel({ badge: "Trending", bestSeller: true, newArrival: false })).toBe("Best Seller");
    expect(cardLabel({ badge: "Classic", bestSeller: false, newArrival: true })).toBe("New In");
    expect(cardLabel({ badge: "", bestSeller: false, newArrival: false })).toBe("");
  });
});
