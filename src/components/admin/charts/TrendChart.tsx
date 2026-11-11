"use client";

import { useState } from "react";
import { compact, formatUnit, niceTicks, shortDay, type Unit } from "./scale";
import { useWidth } from "./useWidth";

const H = 220;
const PAD = { top: 16, right: 64, bottom: 26, left: 52 };

/**
 * Single-series trend over days: a 2px line with a 10% wash, an end dot and
 * end label. Hover/arrow keys move a crosshair that snaps to the nearest day.
 */
export default function TrendChart({
  points,
  label,
  unit,
}: {
  points: { day: string; value: number }[];
  /** What is plotted, e.g. "Revenue" (used in the tooltip and accessible name). */
  label: string;
  unit: Unit;
}) {
  const format = (v: number) => formatUnit(v, unit);
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const max = Math.max(...points.map((p) => p.value), 0);
  const ticks = niceTicks(max, 4, unit === "count");
  const top = ticks[ticks.length - 1];
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const line = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
  const area = `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`;
  const last = points[n - 1];
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 72))));
  const a = active === null ? null : points[active];

  const pick = (clientX: number, rect: DOMRect) => {
    const px = clientX - rect.left;
    const i = Math.round(((px - PAD.left) / iw) * (n - 1));
    setActive(Math.max(0, Math.min(n - 1, i)));
  };

  return (
    <div ref={box} className="relative select-none">
      <svg
        aria-label={`${label} per day, ${shortDay(points[0].day)} to ${shortDay(last.day)}. Use arrow keys to read each day.`}
        className="block outline-none focus-visible:outline-2 focus-visible:outline-[var(--a-gold)] rounded"
        height={H}
        onBlur={() => setActive(null)}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") setActive((i) => Math.min(n - 1, (i ?? -1) + 1));
          if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? n) - 1));
        }}
        onPointerLeave={() => setActive(null)}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        role="img"
        tabIndex={0}
        width={width}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line stroke="var(--a-grid)" strokeWidth={1} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="tabular-nums" fill="var(--a-muted)" fontSize={11} textAnchor="end" x={PAD.left - 8} y={y(t) + 4}>
              {compact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) =>
          (i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
            <text key={p.day} fill="var(--a-muted)" fontSize={11} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} x={x(i)} y={H - 6}>
              {shortDay(p.day)}
            </text>
          ) : null,
        )}
        <path d={area} fill="var(--a-chart)" fillOpacity={0.1} />
        <path d={line} fill="none" stroke="var(--a-chart)" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        {/* End dot + end label (the one direct label) */}
        <circle cx={x(n - 1)} cy={y(last.value)} fill="var(--a-chart)" r={4} stroke="var(--a-panel)" strokeWidth={2} />
        <text fill="var(--a-text)" fontSize={12} fontWeight={600} x={x(n - 1) + 10} y={y(last.value) + 4}>
          {compact(last.value)}
        </text>
        {a && active !== null && (
          <g pointerEvents="none">
            <line stroke="var(--a-axis)" strokeWidth={1} x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + ih} />
            <circle cx={x(active)} cy={y(a.value)} fill="var(--a-chart)" r={5} stroke="var(--a-panel)" strokeWidth={2} />
          </g>
        )}
      </svg>
      {a && active !== null && (
        <div
          aria-live="polite"
          className="absolute top-2 pointer-events-none rounded border border-[var(--a-line)] bg-[var(--a-panel)] px-3 py-2 shadow-md text-xs"
          style={{ left: Math.min(Math.max(x(active) - 70, 0), width - 150), width: 140 }}
        >
          <div className="text-sm font-semibold text-[var(--a-text)]">{format(a.value)}</div>
          <div className="muted flex items-center gap-1.5">
            <span className="inline-block w-3 h-0.5 rounded bg-[var(--a-chart)]" />
            {label} · {shortDay(a.day)}
          </div>
        </div>
      )}
    </div>
  );
}
