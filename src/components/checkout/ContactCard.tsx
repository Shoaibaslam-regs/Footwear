"use client";

import Link from "next/link";
import { useState } from "react";
import { quietLink, SectionHead, sectionBox, TextField, type FieldErrors } from "./fields";

/**
 * Step 1. Logged-in customers (everyone, since checkout needs an account) see one
 * quiet line with their name and email and an "Edit" link; the fields stay in
 * the form (hidden), and open by themselves when one of them has an error.
 */
export default function ContactCard({
  user,
  errors,
}: {
  user: { name: string; email: string } | null;
  errors?: FieldErrors;
}) {
  const [editing, setEditing] = useState(false);
  const hasError = !!(errors?.name || errors?.email);
  const open = !user || editing || hasError;

  return (
    <div className={sectionBox} id="step-section-contact">
      <SectionHead
        aside={
          user ? (
            !open && (
              <button className={quietLink} onClick={() => setEditing(true)} type="button">
                Edit
              </button>
            )
          ) : (
            <Link className={quietLink} href="/login?next=/checkout">
              Log in
            </Link>
          )
        }
        n={1}
        title="Contact"
      />
      {!open && user && (
        <p className="font-body-md text-[15px] text-primary">
          {user.name}
          <span className="block text-[13px] text-on-surface-variant break-all">{user.email}</span>
        </p>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md" hidden={!open}>
        <TextField autoComplete="name" defaultValue={user?.name} errors={errors} label="Full Name *" name="name" required />
        <TextField autoComplete="email" defaultValue={user?.email} errors={errors} inputMode="email" label="Email *" name="email" required type="email" />
      </div>
      <p className="mt-2 font-body-sm text-[12px] text-on-surface-variant">Order updates are sent to this email.</p>
    </div>
  );
}
