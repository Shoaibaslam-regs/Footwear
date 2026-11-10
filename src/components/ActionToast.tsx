"use client";

import { useEffect, useState } from "react";

const SHOW_MS = 2400;

/**
 * Small action feedback at the bottom (listens for showToast() events).
 * Phones: wide and above the WhatsApp button (and any bottom bar); larger
 * screens: a pill at the bottom centre. Springs in, with a gold timer line.
 */
export default function ActionToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);
  // Changes on every message so the timer line restarts.
  const [run, setRun] = useState(0);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      setVisible(true);
      setRun((n) => n + 1);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), SHOW_MS);
    };
    window.addEventListener("elora:toast", onToast);
    return () => {
      window.removeEventListener("elora:toast", onToast);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      aria-live="polite"
      role="status"
      className={`fixed z-[60] pointer-events-none inset-x-4 bottom-[calc(5rem+var(--bottom-bar,0px))] flex justify-center sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:bottom-[calc(1.75rem+var(--bottom-bar,0px))] transition-[opacity,transform] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-opacity ${
        visible ? "opacity-100 translate-y-0 scale-100 duration-500" : "opacity-0 translate-y-4 scale-95 duration-200"
      }`}
    >
      <div className="relative overflow-hidden max-w-full sm:max-w-md bg-primary text-on-primary pl-space-md pr-space-lg py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-outline-variant/30">
        <span className="material-symbols-outlined icon-filled text-secondary-fixed text-[20px] shrink-0">check_circle</span>
        <span className="font-label-uppercase text-[12px] tracking-wider uppercase leading-snug">{message}</span>
        {visible && (
          <span
            key={run}
            aria-hidden="true"
            className="notice-timer absolute left-0 bottom-0 h-0.5 w-full bg-secondary-fixed/80"
            style={{ "--notice-ms": `${SHOW_MS}ms` } as React.CSSProperties}
          />
        )}
      </div>
    </div>
  );
}
