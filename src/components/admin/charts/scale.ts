/** "Nice" axis ticks from 0 to just above `max` (e.g. 0, 50K, 100K, 150K). */
export function niceTicks(max: number, count = 4, integer = false): number[] {
  if (max <= 0) return [0, 1];
  const raw = integer ? Math.max(1, max / count) : max / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw && (!integer || Number.isInteger(s))) ?? 10 * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return ticks;
}

/** 1,284 · 12.9K · 4.2M (axis ticks and compact labels). */
export function compact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (Math.abs(n) >= 10_000) return `${(n / 1000).toFixed(n >= 100_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return n.toLocaleString("en-US");
}

/** "2026-11-09" → "9 Nov" */
export function shortDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
}

export type Unit = "pkr" | "count";
/** Full value for tooltips and tables. */
export const formatUnit = (n: number, unit: Unit) =>
  unit === "pkr" ? `PKR ${Math.round(n).toLocaleString("en-US")}` : n.toLocaleString("en-US");
