"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "./Icons";

/** Hero background loop with a pause control (WCAG 2.2.2) and reduced-motion respect. */
export function HeroLoop() {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);
  // Phones get the still only (no 1.5 MB download); wider screens load the loop after the page has painted.
  const [wantVideo, setWantVideo] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 640px)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (!mq.matches || reduce || conn?.saveData) {
      setPaused(true);
      return;
    }
    const start = () => setWantVideo(true);
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);

  const toggle = () => {
    const v = ref.current;
    if (!wantVideo) {
      setWantVideo(true);
      setPaused(false);
      return;
    }
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  return (
    <>
      {/* Poster is the LCP element: plain img, eager, high priority, phone-sized crop on phones */}
      <picture>
        <source media="(max-width: 639px)" srcSet="/video/hero-bg-poster-m.jpg" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/video/hero-bg-poster.jpg" alt="" fetchPriority="high" decoding="sync" className="absolute inset-0 w-full h-full object-cover object-[30%_center] lg:object-[left_60%] min-[1800px]:object-[left_75%]" aria-hidden />
      </picture>
      {wantVideo && (
        <video ref={ref} className="absolute inset-0 w-full h-full object-cover object-[30%_center] lg:object-[left_60%] min-[1800px]:object-[left_75%]" autoPlay muted loop playsInline preload="auto" aria-hidden>
          <source src="/video/hero-bg.webm" type="video/webm" />
          <source src="/video/hero-bg.mp4" type="video/mp4" />
        </video>
      )}
      <button
        type="button"
        onClick={toggle}
        aria-label={paused ? "Play background animation" : "Pause background animation"}
        aria-pressed={paused}
        className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 z-10 size-9 grid place-items-center rounded-full bg-ink/60 text-paper/80 hover:text-yellow border border-line backdrop-blur"
      >
        {paused ? <Play width={14} height={14} /> : <Pause width={14} height={14} />}
      </button>
    </>
  );
}
