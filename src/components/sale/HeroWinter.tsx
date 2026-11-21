/**
 * The hero's winter layer for the frozen ice skin (owner, 2026-11-21): soft
 * snow drifting down over the photo and frost creeping in at its corners,
 * like a winter window. Always rendered, hidden by CSS unless
 * `html[data-skin="ice"]` (components/sale/SiteSkin.tsx), so the pre-built page
 * needs no clock. Flakes are fixed values (no random numbers in pre-rendered
 * HTML); phones show the first nine. Styles in globals.css `.skin-snow`.
 */
const FLAKES: [left: number, size: number, dur: number, delay: number, sway: number, blur: number][] = [
  [4, 5, 13, -2, 18, 0.6],
  [12, 3, 10, -7, 12, 0],
  [21, 6, 15, -11, 22, 1.2],
  [30, 4, 11, -4, 14, 0.4],
  [39, 3, 9, -1, 10, 0],
  [47, 5, 14, -9, 20, 0.8],
  [56, 4, 12, -6, 16, 0.3],
  [66, 7, 17, -13, 26, 1.6],
  [75, 3, 10, -3, 12, 0],
  [83, 5, 13, -8, 18, 0.6],
  [91, 4, 11, -5, 14, 0.3],
  [97, 3, 9, -10, 10, 0],
  [8, 2.5, 8, -6, 8, 0],
  [35, 2.5, 8.5, -2.5, 8, 0],
  [61, 2.5, 9, -7.5, 9, 0],
  [88, 2.5, 8, -1.5, 8, 0],
];

export default function HeroWinter() {
  return (
    <>
      <div aria-hidden="true" className="skin-frost-window" />
      <div aria-hidden="true" className="skin-snow">
        {FLAKES.map(([left, size, dur, delay, sway, blur], i) => (
          <span
            key={i}
            style={
              {
                left: `${left}%`,
                "--s": `${size}px`,
                "--dur": `${dur}s`,
                "--delay": `${delay}s`,
                "--sway": `${sway}px`,
                "--blur": `${blur}px`,
              } as React.CSSProperties
            }
          >
            <i />
          </span>
        ))}
      </div>
    </>
  );
}
