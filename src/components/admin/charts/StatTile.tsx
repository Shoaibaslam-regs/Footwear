/**
 * KPI tile: label, value, and the change vs the previous period
 * (an arrow and text, never colour alone).
 */
export default function StatTile({
  label,
  value,
  now,
  before,
  period,
  goodWhenUp = true,
  href,
}: {
  label: string;
  value: string;
  now: number;
  before: number;
  period: string;
  goodWhenUp?: boolean;
  href?: string;
}) {
  const diff = now - before;
  const pct = before > 0 ? Math.round((diff / before) * 100) : null;
  const up = diff > 0;
  const good = diff === 0 ? null : up === goodWhenUp;
  const delta =
    diff === 0 ? "No change" : pct === null ? (up ? "New this period" : "—") : `${up ? "▲" : "▼"} ${Math.abs(pct)}%`;
  const Tag = href ? "a" : "div";
  return (
    <Tag className="panel p-4 flex flex-col gap-1 hover:border-[var(--color-outline)] transition-colors" href={href}>
      <span className="muted text-[13px]">{label}</span>
      <span className="text-lg sm:text-2xl font-semibold tracking-tight whitespace-nowrap">{value}</span>
      <span className={`text-xs ${good === null ? "muted" : good ? "text-[var(--a-ok)]" : "text-[var(--a-danger)]"}`}>
        {delta} <span className="muted">vs previous {period}</span>
      </span>
    </Tag>
  );
}
