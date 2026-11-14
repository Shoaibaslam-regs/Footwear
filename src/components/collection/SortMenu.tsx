"use client";

import { useEffect, useId, useRef, useState } from "react";
import { sortOptions, type SortOption } from "@/lib/catalog-filters";

/**
 * The sort control: a themed dropdown instead of the browser's own <select>
 * list. Arrow keys move, Enter picks, Esc or a click outside closes it.
 */
export default function SortMenu({ value, onChange }: { value: SortOption; onChange: (v: SortOption) => void }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = sortOptions.find((o) => o.value === value) ?? sortOptions[0];

  const show = () => {
    setActive(Math.max(0, sortOptions.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  const pick = (v: SortOption) => {
    onChange(v);
    setOpen(false);
    button.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const away = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", away);
    return () => document.removeEventListener("pointerdown", away);
  }, [open]);

  return (
    <div className="relative" ref={root}>
      <button
        aria-controls={`${id}-list`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Sort products: ${current.label}`}
        className={`h-9 flex items-center gap-1.5 pl-space-md pr-space-sm rounded-full font-label-uppercase text-[10px] sm:text-label-uppercase uppercase tracking-wider transition-colors ${
          open ? "bg-primary text-on-primary" : "bg-surface-container text-on-surface hover:bg-surface-container-high"
        }`}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            show();
          }
        }}
        ref={button}
        type="button"
      >
        <span className="whitespace-nowrap">{current.label}</span>
        <span aria-hidden="true" className={`material-symbols-outlined text-[18px] transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <ul
          aria-activedescendant={`${id}-${active}`}
          aria-label="Sort products"
          className="absolute right-0 top-[calc(100%+6px)] z-40 min-w-[200px] py-1.5 rounded-xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(33,27,25,0.16)] ring-1 ring-outline-variant/40 focus:outline-none motion-safe:animate-[sortIn_140ms_ease-out]"
          id={`${id}-list`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => (i + 1) % sortOptions.length);
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => (i - 1 + sortOptions.length) % sortOptions.length);
            } else if (e.key === "Home") {
              e.preventDefault();
              setActive(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setActive(sortOptions.length - 1);
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pick(sortOptions[active].value);
            } else if (e.key === "Escape" || e.key === "Tab") {
              if (e.key === "Escape") e.preventDefault();
              setOpen(false);
              button.current?.focus();
            }
          }}
          ref={list}
          role="listbox"
          tabIndex={-1}
        >
          {sortOptions.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                aria-selected={selected}
                className={`mx-1.5 px-space-sm h-10 flex items-center justify-between gap-space-md rounded-lg cursor-pointer font-label-uppercase text-[11px] uppercase tracking-wider transition-colors ${
                  i === active ? "bg-surface-container" : ""
                } ${selected ? "text-primary font-semibold" : "text-on-surface-variant"}`}
                id={`${id}-${i}`}
                key={o.value}
                onClick={() => pick(o.value)}
                onPointerMove={() => setActive(i)}
                role="option"
              >
                {o.label}
                {selected && (
                  <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                    check
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
