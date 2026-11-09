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
    <div className="bg-surface-container-lowest">
      <button
        aria-controls={panelId}
        aria-expanded={open}
        className="w-full p-space-md flex items-center justify-between font-label-uppercase text-label-uppercase text-primary uppercase tracking-widest text-left"
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
