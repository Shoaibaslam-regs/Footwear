import { eyebrow } from "@/lib/home-type";

/**
 * A home section's label with its number, e.g. "01 — Just In": the number in
 * soft gold, a short hairline, then the label. Numbers follow the page order
 * (app/(shop)/page.tsx), so a reader feels the page as one sequence.
 */
export default function SectionEyebrow({ n, children, center = false }: { n: string; children: React.ReactNode; center?: boolean }) {
  return (
    <span className={`${eyebrow} flex items-center gap-3 ${center ? "justify-center" : ""}`}>
      <span className="tabular-nums text-secondary/60">{n}</span>
      <span aria-hidden="true" className="h-px w-8 sm:w-10 bg-secondary/35" />
      <span>{children}</span>
    </span>
  );
}
