import ConfirmButton from "@/components/admin/ConfirmButton";

export type ClearChoice = {
  /** Sent as the form field `name`. */
  value: string;
  label: string;
  /** How many records it would remove; 0 disables the button. */
  count: number;
  title: string;
  message: string;
};

/**
 * "Delete older than 30 days · 60 days · all": one confirmed button per
 * choice, each showing how many records it would remove.
 */
export default function ClearOlder({
  action,
  name,
  heading,
  note,
  choices,
}: {
  action: (fd: FormData) => Promise<void>;
  name: string;
  heading: string;
  note: string;
  choices: ClearChoice[];
}) {
  return (
    <section className="panel px-4 py-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <h2>{heading}</h2>
        <p className="muted text-[13px]">{note}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {choices.map((c) =>
          c.count === 0 ? (
            <button key={c.value} className="btn btn-sm" disabled title="Nothing to delete" type="button">
              {c.label} (0)
            </button>
          ) : (
            <form key={c.value} action={action}>
              <input name={name} type="hidden" value={c.value} />
              <ConfirmButton
                className="btn btn-sm btn-danger"
                confirmLabel={`Delete ${c.count.toLocaleString("en-US")}`}
                message={c.message}
                title={c.title}
              >
                {c.label} ({c.count.toLocaleString("en-US")})
              </ConfirmButton>
            </form>
          ),
        )}
      </div>
    </section>
  );
}
