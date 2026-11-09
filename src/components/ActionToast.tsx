"use client";

import { useEffect, useState } from "react";

/** Floating action feedback toast (listens for showToast() events). */
export default function ActionToast() {
  const [message, setMessage] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const onToast = (e: Event) => {
      setMessage((e as CustomEvent<string>).detail);
      setVisible(true);
      clearTimeout(timer);
      timer = setTimeout(() => setVisible(false), 2200);
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
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] pointer-events-none transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <div className="bg-primary text-on-primary px-space-lg py-2.5 rounded-full shadow-2xl flex items-center gap-2 font-label-uppercase text-xs tracking-wider uppercase border border-outline-variant/40">
        <span className="material-symbols-outlined text-secondary-fixed text-[18px]">
          check_circle
        </span>
        <span>{message}</span>
      </div>
    </div>
  );
}
