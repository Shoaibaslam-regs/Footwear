"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type HeroSlide = { image: string; alt: string; position?: string };

const SLIDE_MS = 6500;

/**
 * Background slideshow for the hero: cross-fades slides while the active one
 * slowly zooms ("Ken Burns"). Pauses on hover and when the tab is hidden.
 * With reduced motion it stays on one still image.
 */
export default function HeroSlideshow({ slides }: { slides: HeroSlide[] }) {
  const [index, setIndexRaw] = useState(0);
  // The outgoing slide keeps its motion while it fades out (no jump).
  const [prev, setPrev] = useState<number | null>(null);
  const setIndex = (next: number | ((i: number) => number)) =>
    setIndexRaw((i) => {
      const n = typeof next === "function" ? next(i) : next;
      if (n !== i) setPrev(i);
      return n;
    });
  const [hovered, setHovered] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [reduced, setReduced] = useState(false);
  const running = !hovered && !hidden && !reduced && slides.length > 1;

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMq = () => setReduced(mq.matches);
    const onVis = () => setHidden(document.hidden);
    onMq();
    mq.addEventListener("change", onMq);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      mq.removeEventListener("change", onMq);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(() => setIndex((i) => (i + 1) % slides.length), SLIDE_MS);
    return () => clearTimeout(id);
  }, [running, index, slides.length]);

  return (
    <>
      <div
        aria-roledescription="carousel"
        aria-label="Featured collections"
        className="absolute inset-0"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="region"
      >
        {slides.map((s, i) => {
          const active = i === index;
          const moving = (active || i === prev) && !reduced;
          return (
            <div
              key={s.image}
              aria-hidden={!active}
              aria-label={`Slide ${i + 1} of ${slides.length}`}
              aria-roledescription="slide"
              className={`absolute inset-0 transition-opacity duration-[1600ms] ease-in-out motion-reduce:transition-none ${
                active ? "opacity-90" : "opacity-0"
              }`}
              role="group"
            >
              <Image
                alt={s.alt}
                className={`object-cover ${moving ? "animate-kenburns" : "scale-105"}`}
                fetchPriority={i === 0 ? "high" : "low"}
                fill
                priority={i === 0}
                sizes="100vw"
                src={s.image}
                style={{
                  objectPosition: s.position ?? "center",
                  animationDuration: `${SLIDE_MS + 1600}ms`,
                  animationPlayState: running ? "running" : "paused",
                }}
              />
            </div>
          );
        })}
      </div>

      {slides.length > 1 && (
        <div className="absolute z-20 bottom-space-sm left-1/2 -translate-x-1/2 flex items-center gap-space-sm">
          <div className="flex items-center gap-1.5" role="group" aria-label="Choose slide">
            {slides.map((s, i) => (
              <button
                key={s.image}
                aria-current={i === index ? "true" : undefined}
                aria-label={`Show slide ${i + 1}`}
                className="group relative h-6 flex items-center"
                onClick={() => setIndex(i)}
                type="button"
              >
                <span
                  className={`block h-[3px] rounded-full overflow-hidden bg-surface-container-lowest/30 transition-all duration-300 ${
                    i === index ? "w-10" : "w-4 group-hover:w-6 group-hover:bg-surface-container-lowest/60"
                  }`}
                >
                  {i === index && (
                    <span
                      key={`${index}-${running}`}
                      className={`block h-full bg-secondary-fixed ${running ? "animate-[heroProgress_linear_forwards]" : "w-full"}`}
                      style={running ? { animationDuration: `${SLIDE_MS}ms` } : undefined}
                    />
                  )}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
