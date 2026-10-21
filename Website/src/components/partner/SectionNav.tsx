"use client";

import { useEffect, useState } from "react";

export const SECTIONS = [
  ["top", "Top"],
  ["stats", "Stats"],
  ["audience", "Audience"],
  ["redacted", "The show"],
  ["reviews", "Reviews"],
  ["guest-writers", "Guest writers"],
  ["partner-options", "Partner options"],
  ["who", "Team"],
  ["press-kit", "Press kit"],
  ["contact", "Contact"],
] as const;

/** Fixed left-hand section index on wide screens. Always visible: hiding it until the stats band scrolled past meant nobody found it. */
export function SectionNav() {
  const [active, setActive] = useState("top");

  useEffect(() => {
    const els = SECTIONS.map(([id]) => [id, document.getElementById(id)] as const);
    let raf = 0;
    const update = () => {
      raf = 0;
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
    <nav aria-label="Page sections" className="hidden min-[1700px]:block fixed left-6 top-1/2 -translate-y-1/2 z-30">
      {/* Its own dark backing: the nav floats over yellow and red sections, where bare grey text disappears. */}
      <ul className="grid gap-0.5 border border-white/10 bg-ink/85 px-4 py-3 backdrop-blur-sm">
        {SECTIONS.map(([id, label]) => {
          const on = active === id;
          return (
            <li key={id}>
              <a href={`#${id}`} aria-current={on ? "location" : undefined} className={`flex items-center gap-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-colors ${on ? "text-paper" : "text-paper/55 hover:text-paper"}`}>
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
