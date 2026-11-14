"use client";

import { useEffect } from "react";

/** How far a parallax layer may move, as a share of its frame (it is drawn 12% taller each way). */
const PARALLAX_ROOM = 0.11;

/**
 * Drives the CSS in globals.css ("Premium motion"):
 * - marks [data-reveal] / [data-reveal-stagger] elements `.is-in` as they scroll into view
 *   (then `.is-done`, so hover transitions take over again);
 * - scales product photos (img.img-scale) down to size once they are on screen and loaded;
 * - moves [data-parallax] layers as their section scrolls past (speed: data-parallax="0.2");
 * - sets html[data-scrolled] for the frosted header.
 * One observer for everything; nodes added on later navigations are picked up too.
 */
export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motionReady = "";
    const motion = "motion" in root.dataset;

    // A product photo is finished once it has both scrolled in and loaded.
    const settle = (img: HTMLElement) => {
      if (img.classList.contains("is-in") && img.classList.contains("is-loaded") && !img.dataset.settling) {
        img.dataset.settling = "";
        window.setTimeout(() => img.classList.add("is-done"), 2400);
      }
    };

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          reveal.unobserve(el);
          if (el.tagName === "IMG") settle(el);
          // Let the entrance finish (incl. stagger), then hand transitions back to hover styles.
          else window.setTimeout(() => el.classList.add("is-done"), 2000);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const loaded = (img: HTMLImageElement) => {
      img.classList.add("is-loaded");
      settle(img);
    };

    let layers: HTMLElement[] = [];
    const scan = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in), [data-reveal-stagger]:not(.is-in)").forEach((el) => {
        if (motion) reveal.observe(el);
        else el.classList.add("is-in", "is-done");
      });
      scope.querySelectorAll<HTMLImageElement>("img.img-scale:not(.is-loaded)").forEach((img) => {
        if (motion) reveal.observe(img);
        else img.classList.add("is-in", "is-done");
        if (img.complete) loaded(img);
        else {
          img.addEventListener("load", () => loaded(img), { once: true });
          img.addEventListener("error", () => loaded(img), { once: true });
        }
      });
      layers = motion ? [...document.querySelectorAll<HTMLElement>("[data-parallax]")] : [];
    };
    scan(document);

    // Parallax: each layer drifts against the scroll, by its speed, relative to
    // the middle of the screen; clamped to the spare room it is drawn with.
    const parallax = () => {
      const mid = window.innerHeight / 2;
      for (const el of layers) {
        const frame = el.parentElement?.getBoundingClientRect();
        if (!frame || frame.bottom < -200 || frame.top > window.innerHeight + 200) continue;
        const speed = Number(el.dataset.parallax) || 0.15;
        const room = frame.height * PARALLAX_ROOM;
        const y = Math.max(-room, Math.min(room, (mid - (frame.top + frame.height / 2)) * speed));
        el.style.translate = `0 ${y.toFixed(1)}px`;
      }
    };

    let queued = false;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan(document);
        parallax();
      });
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        ticking = false;
        if (window.scrollY > 24) root.dataset.scrolled = "";
        else delete root.dataset.scrolled;
        parallax();
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      reveal.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return null;
}
