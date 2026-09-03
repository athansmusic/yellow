"use client";

import { useEffect, useState } from "react";

export const SECTIONS = [
  ["top", "Top"],
  ["stats", "Stats"],
  ["audience", "Audience"],
  ["redacted", "Redacted"],
  ["reviews", "Audience reviews"],
  ["guest-writers", "Guest writers"],
  ["partner-options", "Partner options"],
  ["who", "Who"],
  ["press-kit", "Press kit"],
  ["contact", "Get in touch"],
] as const;

/** Fixed left-hand section index; appears once the stat band scrolls past, like the original page. */
export function SectionNav() {
  const [active, setActive] = useState("top");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const els = SECTIONS.map(([id]) => [id, document.getElementById(id)] as const);
    const stats = document.getElementById("stats");
    let raf = 0;
    const update = () => {
      raf = 0;
      setShown(!!stats && stats.getBoundingClientRect().top < 0);
      let cur: string = SECTIONS[0][0];
      const limit = window.innerHeight * 0.4;
      for (const [id, el] of els) if (el && el.getBoundingClientRect().top <= limit) cur = id;
      setActive(cur);
    };
    // One layout read per frame at most, however fast the wheel spins
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <nav aria-label="Page sections" className={`hidden min-[1700px]:block fixed left-6 top-1/2 -translate-y-1/2 z-30 transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
      <ul className="grid gap-1">
        {SECTIONS.map(([id, label]) => {
          const on = active === id;
          return (
            <li key={id}>
              <a href={`#${id}`} aria-current={on ? "location" : undefined} className={`flex items-center gap-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${on ? "text-paper" : "text-paper/35 hover:text-paper/70"}`}>
                <span className={`size-1.5 rounded-full ${on ? "bg-paper" : "bg-paper/30"}`} aria-hidden />
                {label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
