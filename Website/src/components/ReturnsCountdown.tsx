"use client";

import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * Big between-seasons countdown to a fixed date (Admin → Settings → Next season date).
 * `label` is the season label, e.g. "Season 2". Renders nothing until mounted (no hydration mismatch).
 */
export function ReturnsCountdown({ to, label, compact = false }: { to: string; label: string; compact?: boolean }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  const target = new Date(to).getTime();
  if (!Number.isFinite(target)) return null;
  const left = now ? parts(target - now) : null;
  const out = now !== null && target - now <= 0;

  if (compact) {
    return (
      <span className="tabular" aria-live="off">
        {out ? "Out now" : left ? `${left.d}d ${left.h}h` : ""}
      </span>
    );
  }

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-paper/70">{out ? `${label} is here` : `REDACTED returns in`}</p>
      {!out && (
        <div className="mt-3 flex gap-3 sm:gap-5" aria-label={`Time until ${label}`}>
          {(
            [
              ["d", "days"],
              ["h", "hours"],
              ["m", "min"],
              ["s", "sec"],
            ] as const
          ).map(([k, l]) => (
            <div key={k} className="min-w-[4.2rem] sm:min-w-[5.5rem] border border-line bg-ink/70 px-2 py-3 text-center">
              <p className="display text-4xl sm:text-6xl text-yellow tabular">{left ? String(left[k]).padStart(2, "0") : "--"}</p>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-paper/60 mt-1">{l}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
