"use client";

import { useEffect, useState } from "react";

const POS_KEY = "tru-player-pos";

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** "Resume from 14:02 · 48%" or "Listened" for this episode, from the player's saved position. Renders nothing for new listeners. */
export function ResumeBadge({ id }: { id: string }) {
  const [state, setState] = useState<{ t: number; pct: number } | null>(null);
  useEffect(() => {
    try {
      const pos = JSON.parse(localStorage.getItem(POS_KEY) ?? "{}") as Record<string, { t: number; d: number }>;
      const p = pos[id];
      if (p && p.d > 0 && p.t > 15) setState({ t: p.t, pct: Math.round((p.t / p.d) * 100) });
    } catch {}
  }, [id]);
  if (!state) return null;
  const done = state.pct >= 97;
  return (
    <span className={`inline-flex items-center gap-2 border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${done ? "border-line text-muted" : "border-yellow/60 text-yellow"}`}>
      {done ? "Listened" : `Resume from ${mmss(state.t)} · ${state.pct}%`}
    </span>
  );
}
