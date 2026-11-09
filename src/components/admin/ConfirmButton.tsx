"use client";

import ConfirmButton from "@/components/ConfirmButton";

/** Admin-styled destructive submit button with a confirmation popup. */
export default function AdminConfirmButton({
  title,
  message,
  confirmLabel = "Delete",
  children,
  className = "btn btn-danger",
  selectionForm,
}: {
  title: string;
  message?: string;
  confirmLabel?: string;
  children: React.ReactNode;
  className?: string;
  selectionForm?: string;
}) {
  return (
    <ConfirmButton
      className={className}
      confirm={{ title, message, confirmLabel, tone: "danger", variant: "admin" }}
      selectionForm={selectionForm}
    >
      {children}
    </ConfirmButton>
  );
}
