"use client";

import { alertDialog, confirmDialog, type ConfirmOptions } from "./Dialogs";

/**
 * Submit button that opens a styled confirmation before its form submits.
 * With `selectionForm`, at least one ticked `ids` checkbox bound to that
 * form is required, and "{n}" in title/message becomes the count.
 */
export default function ConfirmButton({
  confirm,
  selectionForm,
  children,
  className,
  ...button
}: {
  confirm: ConfirmOptions;
  selectionForm?: string;
  children: React.ReactNode;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type">) {
  return (
    <button
      {...button}
      className={className}
      onClick={async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        let { title, message } = confirm;
        if (selectionForm) {
          const n = document.querySelectorAll(
            `input[type="checkbox"][name="ids"][form="${selectionForm}"]:checked`,
          ).length;
          if (n === 0) {
            await alertDialog({ title: "Nothing selected", message: "Tick at least one row first.", variant: confirm.variant });
            return;
          }
          title = title.replace("{n}", String(n));
          message = message?.replace("{n}", String(n));
        }
        if (await confirmDialog({ ...confirm, title, message })) btn.form?.requestSubmit(btn);
      }}
      type="submit"
    >
      {children}
    </button>
  );
}
