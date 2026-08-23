"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * "Thank you to <backer>", cycling through the supporter wall a new name every 0.6s.
 * The server renders the first name so there's always a real one in the HTML; reduced-motion users get a static name.
 */
export function ThankYou({ names, className = "" }: { names: string[]; className?: string }) {
  // Start at 0 on both server and client (no hydration mismatch), then jump to a random name once mounted.
  const [i, setI] = useState(0);
  const [fade, setFade] = useState(false);

  useEffect(() => {
    if (names.length < 2) return;
    setI(Math.floor(Math.random() * names.length));
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = setInterval(() => {
      setFade(true);
      setTimeout(() => {
        setI((n) => {
          let next = Math.floor(Math.random() * names.length);
          if (next === n) next = (n + 1) % names.length;
          return next;
        });
        setFade(false);
      }, 120);
    }, 600);
    return () => clearInterval(t);
  }, [names.length]);

  const name = names[i] ?? names[0] ?? "every backer";
  return (
    // Phones: three stacked lines (fixed height). Wider: one line. A long name truncates instead of reflowing.
    <Link href="/supporter-wall" className={`block text-center sm:grid sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-baseline sm:justify-center sm:gap-x-1.5 sm:h-7 sm:text-left overflow-hidden text-sm text-white/80 hover:text-white ${className}`} aria-live="off">
      <span className="block sm:inline whitespace-nowrap">Thank you to</span>
      <span className={`block sm:inline display text-lg text-yellow truncate transition-opacity duration-100 ${fade ? "opacity-0" : "opacity-100"}`} title={name}>
        {name}
      </span>
      <span className="block sm:inline whitespace-nowrap text-white/60 sm:before:content-['·_']">313% funded on Kickstarter</span>
    </Link>
  );
}
