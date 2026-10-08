"use client";

import { useEffect, useState } from "react";
import { EPISODE, POSTMORTEM, nextStart } from "@/lib/schedule";

const SLOTS = { episode: EPISODE, postmortem: POSTMORTEM } as const;

/** Live countdown to the next release. `to` picks the schedule slot (default: Friday episode). */
export function Countdown({ to = "episode", className = "", prefix = "Next episode in", compact = false }: { to?: keyof typeof SLOTS; className?: string; prefix?: string; compact?: boolean }) {
  const [left, setLeft] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setLeft(nextStart(SLOTS[to]).getTime() - Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [to]);
  if (left == null) return <span className={className} aria-hidden />;
  const s = Math.max(0, Math.floor(left / 1000));
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  return (
    <span className={`tabular ${className}`} aria-live="off">
      {s < 60 ? "Out now" : compact ? `${prefix} ${d > 0 ? `${d}d ` : ""}${h}h${d === 0 ? ` ${m.toString().padStart(2, "0")}m` : ""}` : `${prefix} ${d > 0 ? `${d}d ` : ""}${h}h ${m.toString().padStart(2, "0")}m ${sec.toString().padStart(2, "0")}s`}
    </span>
  );
}
