"use client";

import { useEffect, useRef } from "react";

/**
 * Shared overlay behaviour: Escape closes, body scroll is locked,
 * focus moves into the panel on open and returns to the trigger on close,
 * and Tab is kept inside the panel.
 */
export function useDialog<T extends HTMLElement>(
  open: boolean,
  onClose: () => void,
) {
  const panelRef = useRef<T>(null);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusables = () =>
      Array.from(
        panel?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
    (panel?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = focusables();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previouslyFocused?.focus();
    };
  }, [open, onClose]);

  return panelRef;
}
