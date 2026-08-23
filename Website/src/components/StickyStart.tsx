"use client";

import { useEffect, useState } from "react";
import { PlayButton } from "./AudioPlayer";
import type { Track } from "@/lib/player";

/** Phone-only bar that appears once the main start block has scrolled off, so the CTA stays reachable. */
export function StickyStart({ track, label, afterId }: { track: Track; label: string; afterId: string }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(afterId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, [afterId]);
  return (
    <div className={`sm:hidden fixed inset-x-0 bottom-0 z-30 border-t border-line bg-ink/95 backdrop-blur px-4 py-2 flex items-center gap-3 transition-transform bottom-bar ${show ? "translate-y-0" : "translate-y-full"}`} aria-hidden={!show}>
      <PlayButton track={track} size="sm" />
      <span className="display text-lg">{label}</span>
    </div>
  );
}
