"use client";

import { useEffect, useState } from "react";

/**
 * Seconds left before a rate-limited button works again.
 *
 * `seconds` is what the server answered (`retryAfter`); `token` is that answer
 * itself (the action state or result object), so a second refusal restarts the
 * clock. Returns 0 when the button is free. The server keeps enforcing the
 * limit, so this is only about showing it.
 */
export function useCooldown(seconds: number | null | undefined, token?: unknown): number {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!seconds || seconds <= 0) {
      const id = setTimeout(() => setLeft(0), 0);
      return () => clearTimeout(id);
    }
    const until = Date.now() + seconds * 1000;
    const tick = () => {
      const l = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) clearInterval(timer);
    };
    const first = setTimeout(tick, 0);
    const timer = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [seconds, token]);
  return left;
}

/** 14:32, or 1:02:05 for an hour or more. */
export function clock(left: number): string {
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = String(left % 60).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Button text while locked: "Try again in 14:32". */
export const tryAgainIn = (left: number) => `Try again in ${clock(left)}`;
