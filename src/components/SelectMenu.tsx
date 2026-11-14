"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SelectOption<T extends string | number> = { value: T; label: string; disabled?: boolean; note?: string };

/**
 * A themed dropdown instead of the browser's own <select> list (shop sort,
 * best-seller sizes). Arrow keys move (skipping disabled options), Enter picks,
 * Esc or a click outside closes it. `buttonClassName` styles the trigger;
 * the list matches the site everywhere.
 */
export default function SelectMenu<T extends string | number>({
  value,
  options,
  onChange,
  label,
  buttonClassName,
  align = "right",
  showLabelInButton = true,
}: {
  value: T;
  options: SelectOption<T>[];
  onChange: (v: T) => void;
  /** What is being chosen, for screen readers ("Sort products", "EU size for …"). */
  label: string;
  buttonClassName: (open: boolean) => string;
  align?: "left" | "right" | "stretch";
  /** The trigger's accessible name includes the current choice ("Sort products: Featured"). */
  showLabelInButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value) ?? options[0];

  const step = (from: number, dir: 1 | -1) => {
    for (let k = 1; k <= options.length; k++) {
      const i = (from + dir * k + options.length) % options.length;
      if (!options[i].disabled) return i;
    }
    return from;
  };
  const show = () => {
    const i = options.findIndex((o) => o.value === value);
    setActive(i >= 0 ? i : step(-1, 1));
    setOpen(true);
  };
  const pick = (o: SelectOption<T>) => {
    if (o.disabled) return;
    onChange(o.value);
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
        aria-label={showLabelInButton ? `${label}: ${current.label}` : label}
        className={buttonClassName(open)}
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
        <span className="whitespace-nowrap truncate">{current.label}</span>
        <span aria-hidden="true" className={`material-symbols-outlined text-[18px] shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          expand_more
        </span>
      </button>

      {open && (
        <ul
          aria-activedescendant={`${id}-${active}`}
          aria-label={label}
          className={`absolute top-[calc(100%+6px)] z-40 py-1.5 rounded-xl bg-surface-container-lowest shadow-[0_12px_32px_rgba(33,27,25,0.16)] ring-1 ring-outline-variant/40 focus:outline-none max-h-72 overflow-y-auto overscroll-contain motion-safe:animate-[sortIn_140ms_ease-out] ${
            align === "stretch" ? "inset-x-0" : align === "left" ? "left-0 min-w-[200px]" : "right-0 min-w-[200px]"
          }`}
          id={`${id}-list`}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActive((i) => step(i, 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActive((i) => step(i, -1));
            } else if (e.key === "Home") {
              e.preventDefault();
              setActive(step(-1, 1));
            } else if (e.key === "End") {
              e.preventDefault();
              setActive(step(options.length, -1));
            } else if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              pick(options[active]);
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
          {options.map((o, i) => {
            const selected = o.value === value;
            return (
              <li
                aria-disabled={o.disabled || undefined}
                aria-selected={selected}
                className={`mx-1.5 px-space-sm h-10 flex items-center justify-between gap-space-md rounded-lg font-label-uppercase text-[11px] uppercase tracking-wider transition-colors ${
                  o.disabled ? "text-outline/60 cursor-not-allowed" : "cursor-pointer"
                } ${i === active && !o.disabled ? "bg-surface-container" : ""} ${selected ? "text-primary font-semibold" : o.disabled ? "" : "text-on-surface-variant"}`}
                id={`${id}-${i}`}
                key={String(o.value)}
                onClick={() => pick(o)}
                onPointerMove={() => !o.disabled && setActive(i)}
                role="option"
              >
                <span className={o.disabled ? "line-through" : undefined}>{o.label}</span>
                {o.note ? (
                  <span className="normal-case tracking-normal text-[10px] text-outline">{o.note}</span>
                ) : (
                  selected && (
                    <span aria-hidden="true" className="material-symbols-outlined text-[16px] text-secondary">
                      check
                    </span>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
