import Link from "next/link";
import { TextField, type FieldErrors } from "./fields";

export default function ContactCard({
  user,
  errors,
}: {
  user: { name: string; email: string } | null;
  errors?: FieldErrors;
}) {
  return (
    <div className="bg-surface-container-lowest p-space-md sm:p-space-lg shadow-sm">
      <div className="flex items-baseline justify-between mb-space-md">
        <div className="flex items-center gap-space-sm">
          <span className="w-7 h-7 bg-primary text-on-primary font-label-uppercase text-label-uppercase flex items-center justify-center font-semibold">
            1
          </span>
          <h2 className="font-headline-sm text-headline-sm text-primary font-normal">Contact</h2>
        </div>
        {user ? (
          <span className="font-label-uppercase text-label-uppercase text-secondary uppercase tracking-widest flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">verified</span>
            Logged in
          </span>
        ) : (
          <Link
            className="font-label-uppercase text-label-uppercase uppercase tracking-wider text-secondary hover:text-primary transition-colors underline underline-offset-4"
            href="/login?next=/checkout"
          >
            Log in for faster checkout
          </Link>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        <TextField autoComplete="name" defaultValue={user?.name} errors={errors} label="Full Name *" name="name" required />
        <TextField autoComplete="email" defaultValue={user?.email} errors={errors} label="Email *" name="email" required type="email" />
      </div>
      <p className="mt-space-sm font-body-sm text-body-sm text-on-surface-variant">
        Order confirmation and delivery updates are sent to this email.
      </p>
    </div>
  );
}
