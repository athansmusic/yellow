"use client";

import { useEffect, useRef, useState } from "react";

export const short = (n: number) => (n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M` : Math.round(n).toLocaleString("en-US"));

/** Counts up from 0 when scrolled into view. Hover shows the full figure for rounded values. */
export function Counter({ value, suffix = "", className = "" }: { value: number; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  // Server HTML (and crawlers, link previews, reduced motion) carry the real figure; the count-up is a client-only flourish.
  const [n, setN] = useState(value);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setN(value);
      return;
    }
    setN(0);
    let raf = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const frame = (now: number) => {
          const p = Math.min((now - start) / 900, 1);
          setN((1 - Math.pow(1 - p, 3)) * value);
          if (p < 1) raf = requestAnimationFrame(frame);
          else setN(value);
        };
        raf = requestAnimationFrame(frame);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value]);

  const full = Math.round(value).toLocaleString("en-US");
  const text = hover && n === value ? full : short(n);
  return (
    <span ref={ref} className={`tabular ${className}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} title={full !== short(value) ? full : undefined}>
      {text}
      {suffix}
    </span>
  );
}

/** Grows to its percentage when scrolled into view (platform breakdown bars). */
export function Bar({ pct }: { pct: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setOn(true), io.disconnect()), { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className="h-0.5 bg-white/10">
      <div className="h-full bg-yellow transition-[width] duration-1000 ease-out motion-reduce:transition-none" style={{ width: on ? `${pct}%` : 0 }} />
    </div>
  );
}
