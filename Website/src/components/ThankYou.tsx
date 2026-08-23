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
    <Link href="/supporter-wall" className={`inline-flex items-baseline justify-center gap-1.5 text-sm text-white/80 hover:text-white ${className}`} aria-live="off">
      <span>Thank you to</span>
      <span className={`display text-lg text-yellow transition-opacity duration-100 ${fade ? "opacity-0" : "opacity-100"}`}>{name}</span>
      <span className="text-white/60">· 313% funded on Kickstarter</span>
    </Link>
  );
}
