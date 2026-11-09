/** A chart card: title, one-line explanation, the chart, and an always-available table view. */
export default function ChartCard({
  title,
  subtitle,
  children,
  table,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  /** Rows for the "View as table" fallback. */
  table?: { head: [string, string]; rows: [string, string][] };
  className?: string;
}) {
  return (
    <section className={`panel p-4 sm:p-5 flex flex-col gap-3 min-w-0 ${className}`}>
      <div>
        <h2>{title}</h2>
        {subtitle && <p className="muted text-[13px]">{subtitle}</p>}
      </div>
      <div className="min-w-0">{children}</div>
      {table && table.rows.length > 0 && (
        <details className="text-[13px]">
          <summary className="muted cursor-pointer select-none hover:text-[var(--a-text)]">View as table</summary>
          <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-[var(--a-line)]">
            <table>
              <thead>
                <tr>
                  <th>{table.head[0]}</th>
                  <th className="text-right">{table.head[1]}</th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map(([a, b], i) => (
                  <tr key={i}>
                    <td>{a}</td>
                    <td className="text-right tabular-nums">{b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
