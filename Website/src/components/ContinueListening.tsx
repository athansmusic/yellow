"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PlayButton } from "./AudioPlayer";
import type { Track } from "@/lib/player";

const LAST_KEY = "tru-player-last";
const POS_KEY = "tru-player-pos";

/**
 * "Continue listening" for returning visitors: the last thing they played, with how far in they were.
 * Renders the fallback (latest episode) until hydration and for first-time visitors.
 */
export function ContinueListening({ fallback }: { fallback: React.ReactNode }) {
  const [last, setLast] = useState<{ t: Track; pct: number } | null>(null);

  useEffect(() => {
    try {
      const t = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as Track | null;
      if (!t) return;
      const pos = JSON.parse(localStorage.getItem(POS_KEY) ?? "{}") as Record<string, { t: number; d: number }>;
      const p = pos[t.id];
      const pct = p && p.d > 0 ? Math.round((p.t / p.d) * 100) : 0;
      if (pct >= 97) return; // finished it; show the latest episode instead
      setLast({ t, pct });
    } catch {}
  }, []);

  if (!last) return <>{fallback}</>;
  return (
    <div className="md:pr-6 flex items-center gap-3">
      <PlayButton track={last.t} size="sm" />
      <div className="min-w-0">
        <p className="eyebrow text-yellow">Continue listening{last.pct > 0 ? ` · ${last.pct}%` : ""}</p>
        <Link href={last.t.href ?? "/episodes"} className="display text-xl leading-none block truncate hover:text-yellow">
          {last.t.title}
        </Link>
      </div>
    </div>
  );
}
