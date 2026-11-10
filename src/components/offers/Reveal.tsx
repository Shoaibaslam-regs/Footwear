"use client";

import { createContext, useContext, useState } from "react";

/** Whether the scratch card on this page has been revealed; shared so prices below can stay hidden until then. */
const RevealContext = createContext<{ revealed: boolean; setRevealed: (v: boolean) => void }>({
  revealed: false,
  setRevealed: () => {},
});

export function RevealProvider({ initial, children }: { initial: boolean; children: React.ReactNode }) {
  const [revealed, setRevealed] = useState(initial);
  return <RevealContext.Provider value={{ revealed, setRevealed }}>{children}</RevealContext.Provider>;
}

export const useReveal = () => useContext(RevealContext);

/** Shows `before` until the card is scratched, then `after` (e.g. the price with the coupon). */
export function WhenRevealed({ before, after }: { before: React.ReactNode; after: React.ReactNode }) {
  return <>{useReveal().revealed ? after : before}</>;
}
