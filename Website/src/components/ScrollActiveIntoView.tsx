"use client";

import { useEffect } from "react";

/** Horizontally scrolls the element with aria-current inside `#id` into view on mount (phone tab strips). */
export function ScrollActiveIntoView({ id }: { id: string }) {
  useEffect(() => {
    const strip = document.getElementById(id);
    const active = strip?.querySelector<HTMLElement>("[aria-current]");
    if (!strip || !active) return;
    if (strip.scrollWidth <= strip.clientWidth) return;
    const left = active.offsetLeft - (strip.clientWidth - active.offsetWidth) / 2;
    strip.scrollTo({ left: Math.max(0, left), behavior: "instant" as ScrollBehavior });
  }, [id]);
  return null;
}
