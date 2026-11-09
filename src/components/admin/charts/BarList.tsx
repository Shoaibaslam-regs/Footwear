/**
 * Horizontal bars on one baseline (ranked or in a meaningful order). One hue;
 * the value sits at the bar tip in ink, never in the bar colour.
 */
export default function BarList({
  rows,
  format,
  empty,
}: {
  rows: { key: string; label: React.ReactNode; value: number; hint?: string }[];
  format: (n: number) => string;
  empty: string;
}) {
  const max = Math.max(...rows.map((r) => r.value), 0);
  if (rows.length === 0 || max === 0) return <p className="muted py-6 text-center">{empty}</p>;
  return (
    <ul className="flex flex-col gap-2.5">
      {rows.map((r) => (
        <li key={r.key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-center gap-3" title={r.hint}>
          <span className="truncate text-[13px]">{r.label}</span>
          <span className="flex items-center gap-2 min-w-0">
            {/* The track takes the free width; each bar is a true share of the largest value. */}
            <span className="flex-1 min-w-0">
              <span
                className="block h-3.5 rounded-r-[4px] bg-[var(--a-chart)]"
                style={{ width: `${(r.value / max) * 100}%`, minWidth: r.value > 0 ? 3 : 0 }}
              />
            </span>
            <span className="w-16 shrink-0 text-[13px] font-semibold tabular-nums whitespace-nowrap">{format(r.value)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
