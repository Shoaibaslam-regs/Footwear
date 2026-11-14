"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

export type HeroSlide = { image: string; alt: string; position?: string };

/** Slower slides feel calmer; the thin line shows the time left. */
const SLIDE_MS = 8000;

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
  const layer = useRef<HTMLDivElement>(null);

  // Gentle parallax: the photo drifts slower than the page while the hero is on screen.
  useEffect(() => {
    const el = layer.current;
    if (!el || reduced) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const h = el.parentElement?.offsetHeight ?? 0;
      const y = window.scrollY;
      if (y > h) return;
      el.style.transform = `translate3d(0, ${Math.round(y * 0.25)}px, 0)`;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reduced]);

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
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % slides.length),
      SLIDE_MS,
    );
    return () => clearTimeout(id);
  }, [running, index, slides.length]);

  return (
    <>
      <div
        ref={layer}
        aria-roledescription="carousel"
        aria-label="Featured collections"
        className="absolute inset-x-0 -inset-y-[12%]"
        data-parallax="0.25"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        role="region"
      >
        {slides.map((s, i) => {
          const active = i === index;
          const moving = (active || i === prev) && !reduced;
          // Mount only what's on screen plus the next slide (preloaded), not all of them.
          const mounted =
            active || i === prev || i === (index + 1) % slides.length;
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
              {mounted && (
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
              )}
            </div>
          );
        })}
      </div>

    </>
  );
}
