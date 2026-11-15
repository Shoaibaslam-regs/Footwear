/**
 * Checkout, calm and phone-first (DESIGN.md "Phones first"): outlined square
 * fields 48 px tall with 16 px text (so iPhones don't zoom in), small labels
 * above, sections in a hairline box instead of shadowed cards.
 */
export const fieldLabel = "font-label-uppercase text-[10px] sm:text-[11px] text-on-surface-variant tracking-[0.16em] uppercase font-medium";
export const fieldInput =
  "h-12 w-full px-3.5 bg-surface-container-lowest text-on-surface font-body-md text-[16px] rounded-none ring-1 ring-inset ring-outline-variant/80 placeholder:text-outline/70 focus:outline-none focus:ring-2 focus:ring-primary transition-shadow aria-invalid:ring-2 aria-invalid:ring-error";

/** A checkout section: square, hairline border, no shadow. */
export const sectionBox = "bg-surface-container-lowest ring-1 ring-outline-variant/40 p-space-md sm:p-space-lg scroll-mt-28";

/** Small numbered square, the title, and an optional quiet item on the right. */
export function SectionHead({ n, title, aside }: { n: number; title: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-space-sm mb-space-md">
      <div className="flex items-center gap-2.5">
        <span className="w-6 h-6 ring-1 ring-inset ring-primary text-primary font-label-uppercase text-[11px] flex items-center justify-center">{n}</span>
        <h2 className="font-headline-sm text-[19px] sm:text-[21px] text-primary font-normal leading-none">{title}</h2>
      </div>
      {aside}
    </div>
  );
}

/** A small underlined text button ("Edit", "Change", "+ Add flat or floor"). */
export const quietLink = "font-label-uppercase text-[10px] sm:text-[11px] uppercase tracking-[0.16em] text-secondary underline underline-offset-4 hover:text-primary";

export type FieldErrors = Record<string, string[] | undefined> | undefined;

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p className="font-body-sm text-body-sm text-error" id={`${id}-error`}>
      {errors.join(" ")}
    </p>
  );
}

/** Labelled checkout text input wired to server-side field errors. */
export function TextField({
  name,
  label,
  errors,
  className = "",
  ...input
}: {
  name: string;
  label: string;
  errors?: FieldErrors;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = `co-${name}`;
  const err = errors?.[name];
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className={fieldLabel} htmlFor={id}>
        {label}
      </label>
      <input
        aria-describedby={err ? `${id}-error` : undefined}
        aria-invalid={err ? true : undefined}
        className={fieldInput}
        id={id}
        name={name}
        {...input}
      />
      <FieldError errors={err} id={id} />
    </div>
  );
}
