"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "./Icons";

/** Hero background loop with a pause control (WCAG 2.2.2) and reduced-motion respect. */
export function HeroLoop() {
  const ref = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      setPaused(true);
    }
  }, []);

  const toggle = () => {
    const v = ref.current;
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
      <video ref={ref} className="absolute inset-0 w-full h-full object-cover object-[30%_center] lg:object-[left_60%] min-[1800px]:object-[left_75%]" autoPlay muted loop playsInline poster="/video/hero-bg-poster.jpg" aria-hidden>
        <source src="/video/hero-bg.webm" type="video/webm" />
        <source src="/video/hero-bg.mp4" type="video/mp4" />
      </video>
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
