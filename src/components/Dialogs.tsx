"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { setLoginNavigator } from "@/lib/require-login";
import { createPortal } from "react-dom";
import { useDialog } from "./header/useDialog";

/**
 * App-wide replacement for window.confirm / window.alert.
 * Call `confirmDialog()` / `alertDialog()` from any client code;
 * `<DialogHost />` (mounted once in the root layout) renders them.
 */

export type DialogVariant = "brand" | "admin";

type Request = {
  kind: "confirm" | "alert";
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: "danger" | "default";
  variant: DialogVariant;
  icon?: string;
  image?: { src: string; alt: string };
  resolve: (ok: boolean) => void;
};

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

function open(req: Omit<Request, "resolve">): Promise<boolean> {
  current?.resolve(false); // a new dialog replaces (and cancels) an open one
  return new Promise((resolve) => {
    current = { ...req, resolve };
    emit();
  });
}

function settle(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

export type ConfirmOptions = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  variant?: DialogVariant;
  icon?: string;
  /** Product thumbnail shown instead of the icon. */
  image?: { src: string; alt: string };
};

export function confirmDialog(o: ConfirmOptions): Promise<boolean> {
  return open({
    kind: "confirm",
    title: o.title,
    message: o.message,
    confirmLabel: o.confirmLabel ?? "Confirm",
    cancelLabel: o.cancelLabel ?? "Cancel",
    tone: o.tone ?? "default",
    variant: o.variant ?? "brand",
    icon: o.icon,
    image: o.image,
  });
}

export async function alertDialog(o: Omit<ConfirmOptions, "cancelLabel" | "tone">): Promise<void> {
  await open({
    kind: "alert",
    title: o.title,
    message: o.message,
    confirmLabel: o.confirmLabel ?? "OK",
    cancelLabel: "",
    tone: "default",
    variant: o.variant ?? "brand",
    icon: o.icon,
  });
}

export default function DialogHost() {
  const router = useRouter();
  useEffect(() => setLoginNavigator((href) => router.push(href)), [router]);
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  if (!req) return null;
  return createPortal(<DialogPanel key={`${req.title}-${req.message}`} req={req} />, document.body);
}

const styles = {
  brand: {
    panel: "bg-surface-container-lowest rounded-2xl shadow-2xl p-space-lg sm:p-space-xl max-w-md",
    icon: "w-12 h-12 rounded-full bg-secondary-fixed/50 text-secondary flex items-center justify-center",
    iconDanger: "w-12 h-12 rounded-full bg-tertiary-fixed text-on-tertiary-fixed-variant flex items-center justify-center",
    eyebrow: "font-label-uppercase text-label-uppercase uppercase tracking-[0.2em] text-secondary",
    image: "relative w-20 h-24 rounded-lg overflow-hidden bg-surface-container shrink-0 shadow-sm",
    title: "font-headline-sm text-headline-sm text-primary",
    message: "font-body-md text-body-md text-on-surface-variant",
    cancel:
      "h-12 px-space-lg rounded-full bg-surface-container hover:bg-surface-container-high text-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors",
    confirm:
      "h-12 px-space-lg rounded-full bg-primary hover:bg-secondary-fixed text-on-primary hover:text-on-secondary-fixed font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors shadow-md",
    danger:
      "h-12 px-space-lg rounded-full bg-primary hover:bg-error text-on-primary font-label-uppercase text-label-uppercase uppercase tracking-widest transition-colors shadow-md",
    backdrop: "bg-primary/50 backdrop-blur-sm",
  },
  admin: {
    panel: "bg-white rounded-lg border border-[#e3e3e3] shadow-xl p-5 max-w-sm font-sans text-[14px] text-[#1b1c1a]",
    icon: "w-9 h-9 rounded-full bg-[#f0f0f0] text-[#1b1c1a] flex items-center justify-center",
    iconDanger: "w-9 h-9 rounded-full bg-[#fef3f2] text-[#b42318] flex items-center justify-center",
    eyebrow: "hidden",
    image: "relative w-14 h-16 rounded overflow-hidden bg-[#eee] shrink-0",
    title: "text-[16px] font-semibold",
    message: "text-[#6b6b6b]",
    cancel: "h-9 px-4 rounded-md border border-[#e3e3e3] bg-white hover:bg-[#f0f0f0] font-medium",
    confirm: "h-9 px-4 rounded-md bg-[#1b1c1a] hover:bg-[#333] text-white font-medium",
    danger: "h-9 px-4 rounded-md bg-[#b42318] hover:bg-[#912018] text-white font-medium",
    backdrop: "bg-black/40",
  },
} as const;

function DialogPanel({ req }: { req: Request }) {
  const s = styles[req.variant];
  const cancel = () => settle(req.kind === "alert");
  const ref = useDialog<HTMLDivElement>(true, cancel);
  const icon = req.icon ?? (req.kind === "alert" ? "info" : req.tone === "danger" ? "warning" : "help");

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4">
      <div aria-hidden="true" className={`absolute inset-0 ${s.backdrop}`} onClick={cancel} />
      <div
        ref={ref}
        aria-describedby={req.message ? "dialog-message" : undefined}
        aria-labelledby="dialog-title"
        aria-modal="true"
        className={`relative w-full flex flex-col gap-4 motion-safe:animate-[dialogIn_160ms_ease-out] ${s.panel}`}
        role={req.kind === "alert" ? "alertdialog" : "dialog"}
      >
        <div className={`flex gap-4 ${req.image ? "items-center" : "flex-col"}`}>
          {req.image ? (
            <span className={s.image}>
              <Image alt={req.image.alt} className="object-cover" fill sizes="80px" src={req.image.src} />
            </span>
          ) : (
            <span className={req.tone === "danger" ? s.iconDanger : s.icon}>
              <span className="material-symbols-outlined text-[22px]">{icon}</span>
            </span>
          )}
          <div className="flex flex-col gap-1 min-w-0">
            {req.variant === "brand" && <span className={s.eyebrow}>Maison ÉLORA</span>}
            <h2 className={s.title} id="dialog-title">
              {req.title}
            </h2>
            {req.message && (
              <p className={s.message} id="dialog-message">
                {req.message}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          {req.kind === "confirm" && (
            <button className={s.cancel} onClick={() => settle(false)} type="button">
              {req.cancelLabel}
            </button>
          )}
          <button
            className={req.tone === "danger" ? s.danger : s.confirm}
            data-autofocus={req.tone !== "danger" ? true : undefined}
            onClick={() => settle(true)}
            type="button"
          >
            {req.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
