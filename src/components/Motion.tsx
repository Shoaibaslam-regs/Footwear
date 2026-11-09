"use client";

import { useEffect } from "react";

/**
 * Drives the CSS in globals.css ("Premium motion"):
 * - marks [data-reveal] / [data-reveal-stagger] elements `.is-in` as they scroll into view
 *   (then `.is-done`, so hover transitions take over again);
 * - fades in img.img-fade once loaded;
 * - sets html[data-scrolled] for the frosted header.
 * One observer for everything; nodes added on later navigations are picked up too.
 */
export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    root.dataset.motionReady = "";
    const motion = "motion" in root.dataset;

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const el = e.target as HTMLElement;
          el.classList.add("is-in");
          reveal.unobserve(el);
          // Let the entrance finish (incl. stagger), then hand transitions back to hover styles.
          window.setTimeout(() => el.classList.add("is-done"), 1900);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );

    const loaded = (img: HTMLImageElement) => img.classList.add("is-loaded");
    const scan = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-in), [data-reveal-stagger]:not(.is-in)").forEach((el) => {
        if (motion) reveal.observe(el);
        else el.classList.add("is-in", "is-done");
      });
      scope.querySelectorAll<HTMLImageElement>("img.img-fade:not(.is-loaded)").forEach((img) => {
        if (img.complete) loaded(img);
        else {
          img.addEventListener("load", () => loaded(img), { once: true });
          img.addEventListener("error", () => loaded(img), { once: true });
        }
      });
    };
    scan(document);

    let queued = false;
    const mutations = new MutationObserver(() => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        scan(document);
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
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      reveal.disconnect();
      mutations.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);
  return null;
}
