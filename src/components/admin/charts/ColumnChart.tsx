"use client";

import { useState } from "react";
import { compact, formatUnit, niceTicks, shortDay, type Unit } from "./scale";
import { useWidth } from "./useWidth";

const H = 200;
const PAD = { top: 12, right: 12, bottom: 26, left: 40 };

/** Columns per day: ≤24px wide, 4px rounded tops, square at the baseline; each column has its own tooltip. */
export default function ColumnChart({
  points,
  label,
  unit,
}: {
  points: { day: string; value: number }[];
  label: string;
  unit: Unit;
}) {
  const format = (v: number) => formatUnit(v, unit);
  const [box, width] = useWidth<HTMLDivElement>();
  const [active, setActive] = useState<number | null>(null);
  const n = points.length;
  const ticks = niceTicks(Math.max(...points.map((p) => p.value), 0), 4, unit === "count");
  const top = ticks[ticks.length - 1];
  const iw = width - PAD.left - PAD.right;
  const ih = H - PAD.top - PAD.bottom;
  const band = iw / n;
  const bw = Math.max(2, Math.min(24, band - 2)); // 2px surface gap between neighbours
  const y = (v: number) => PAD.top + ih - (v / top) * ih;
  const every = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(iw / 72))));
  const a = active === null ? null : points[active];
  const cx = (i: number) => PAD.left + band * i + band / 2;

  return (
    <div ref={box} className="relative select-none">
      <svg aria-label={`${label} per day`} height={H} onPointerLeave={() => setActive(null)} role="group" width={width}>
        {ticks.map((t) => (
          <g key={t}>
            <line stroke="var(--a-grid)" strokeWidth={1} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} />
            <text className="tabular-nums" fill="var(--a-muted)" fontSize={11} textAnchor="end" x={PAD.left - 8} y={y(t) + 4}>
              {compact(t)}
            </text>
          </g>
        ))}
        {points.map((p, i) => {
          const h = Math.max(0, y(0) - y(p.value));
          const r = Math.min(4, h, bw / 2);
          const x0 = cx(i) - bw / 2;
          const y0 = y(p.value);
          // Rounded top, square bottom.
          const d = h <= 0 ? "" : `M${x0},${y(0)}V${y0 + r}Q${x0},${y0} ${x0 + r},${y0}H${x0 + bw - r}Q${x0 + bw},${y0} ${x0 + bw},${y0 + r}V${y(0)}Z`;
          return (
            <g
              key={p.day}
              aria-label={`${shortDay(p.day)}: ${format(p.value)}`}
              className="outline-none"
              onBlur={() => setActive(null)}
              onFocus={() => setActive(i)}
              onPointerEnter={() => setActive(i)}
              role="img"
              tabIndex={0}
            >
              {/* Hit area: the whole band, taller than the mark */}
              <rect fill="transparent" height={ih} width={band} x={PAD.left + band * i} y={PAD.top} />
              {d && <path d={d} fill="var(--a-chart)" fillOpacity={active === null || active === i ? 1 : 0.45} />}
            </g>
          );
        })}
        <line stroke="var(--a-axis)" strokeWidth={1} x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} />
        {points.map((p, i) =>
          (i % every === 0 && n - 1 - i >= every / 2) || i === n - 1 ? (
            <text key={p.day} fill="var(--a-muted)" fontSize={11} textAnchor={i === n - 1 ? "end" : i === 0 ? "start" : "middle"} x={i === n - 1 ? cx(i) + band / 2 : i === 0 ? cx(i) - band / 2 : cx(i)} y={H - 6}>
              {shortDay(p.day)}
            </text>
          ) : null,
        )}
      </svg>
      {a && active !== null && (
        <div
          className="absolute top-1 pointer-events-none rounded border border-[var(--a-line)] bg-[var(--a-panel)] px-3 py-2 shadow-md text-xs"
          style={{ left: Math.min(Math.max(cx(active) - 60, 0), width - 130), width: 120 }}
        >
          <div className="text-sm font-semibold text-[var(--a-text)]">{format(a.value)}</div>
          <div className="muted">{shortDay(a.day)}</div>
        </div>
      )}
    </div>
  );
}
