"use client";

import { useId, useState, type ReactNode } from "react";

export default function Accordion({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    // A hairline row: no box, so the details read as one calm list.
    <div className="border-b border-outline-variant/40">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="w-full min-h-12 py-space-sm flex items-center justify-between font-label-uppercase text-[11px] text-primary uppercase tracking-[0.16em] text-left"
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        <span>{title}</span>
        <span
          className={`material-symbols-outlined text-[20px] transition-transform duration-300${
            open ? " rotate-180" : ""
          }`}
        >
          expand_more
        </span>
      </button>
      <div id={panelId} hidden={!open} className={className}>
        {children}
      </div>
    </div>
  );
}
