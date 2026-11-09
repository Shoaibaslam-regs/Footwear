"use client";

/** Header checkbox that toggles every `name="ids"` checkbox bound to `form`. */
export default function SelectAll({ form, label }: { form: string; label: string }) {
  return (
    <input
      aria-label={label}
      onChange={(e) => {
        document
          .querySelectorAll<HTMLInputElement>(`input[type="checkbox"][name="ids"][form="${form}"]`)
          .forEach((box) => (box.checked = e.target.checked));
      }}
      type="checkbox"
    />
  );
}
