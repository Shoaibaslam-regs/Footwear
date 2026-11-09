export const fieldLabel =
  "font-label-sm text-label-sm text-on-surface-variant tracking-wider uppercase font-semibold";
export const fieldInput =
  "h-12 w-full px-space-md bg-surface-container-low text-on-surface font-body-md text-body-md rounded-none focus:bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary transition-all aria-invalid:ring-2 aria-invalid:ring-error";

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
    <div className={`flex flex-col gap-1 ${className}`}>
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
