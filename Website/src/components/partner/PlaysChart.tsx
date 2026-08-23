"use client";

import { useMemo, useState } from "react";
import type { PlaysSeries } from "@/lib/partnerStats";

const SERIES = [
  { key: "apple", label: "Apple Podcasts", color: "#FFF200" },
  { key: "spotify", label: "Spotify", color: "#C87800" },
  { key: "pocket", label: "Pocket Casts", color: "#963C00" },
  { key: "others", label: "Others", color: "#501E00" },
] as const;

const W = 600;
const H = 280;
const PAD = { t: 12, r: 8, b: 26, l: 40 };

const fmtDate = (iso: string, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", long ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });

/** Stacked area chart of daily plays, same shape and palette as the original Chart.js version. */
export function PlaysChart({ data }: { data: PlaysSeries }) {
  const [hov, setHov] = useState<number | null>(null);
  const n = data.dates.length;

  const { paths, max, stacks } = useMemo(() => {
    const n = data.dates.length;
    // Stack top-down in the order Apple, Spotify, Pocket, Others (each series sits on the ones after it)
    const order = ["others", "pocket", "spotify", "apple"] as const;
    const stacks: Record<string, number[]> = {};
    let prev = new Array(n).fill(0);
    for (const k of order) {
      const cur = data[k].map((v, i) => prev[i] + v);
      stacks[k] = cur;
      prev = cur;
    }
    const max = Math.max(1, ...stacks.apple);
    const x = (i: number) => PAD.l + (i / Math.max(1, n - 1)) * (W - PAD.l - PAD.r);
    const y = (v: number) => PAD.t + (1 - v / max) * (H - PAD.t - PAD.b);
    const line = (arr: number[]) => arr.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const paths: Record<string, string> = {};
    let below = new Array(n).fill(0);
    for (const k of order) {
      const top = stacks[k];
      const back = below.map((v, i) => `L${x(n - 1 - i).toFixed(1)},${y(below[n - 1 - i]).toFixed(1)}`).join("");
      paths[k] = `${line(top)}${back}Z`;
      below = top;
    }
    return { paths, max, stacks };
  }, [data]);

  if (n < 2) return null;
  const x = (i: number) => PAD.l + (i / (n - 1)) * (W - PAD.l - PAD.r);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // Month labels: first day of each month present
  const months = data.dates.map((d, i) => ({ d, i })).filter(({ d, i }) => i === 0 || d.slice(0, 7) !== data.dates[i - 1].slice(0, 7));

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto block"
        role="img"
        aria-label="Daily plays by platform, stacked area chart"
        onMouseMove={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          const i = Math.round(((px - PAD.l) / (W - PAD.l - PAD.r)) * (n - 1));
          setHov(Math.max(0, Math.min(n - 1, i)));
        }}
        onMouseLeave={() => setHov(null)}
      >
        {ticks.map((t) => {
          const yy = PAD.t + (1 - t / max) * (H - PAD.t - PAD.b);
          return (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={yy} y2={yy} stroke="rgba(255,255,255,0.07)" />
              <text x={PAD.l - 6} y={yy + 3} textAnchor="end" fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-body)">
                {t >= 1000 ? `${(t / 1000).toFixed(t >= 10000 ? 0 : 1).replace(/\.0$/, "")}k` : t}
              </text>
            </g>
          );
        })}
        {["others", "pocket", "spotify", "apple"].map((k) => {
          const s = SERIES.find((s) => s.key === k)!;
          return <path key={k} d={paths[k]} fill={s.color} fillOpacity={0.8} stroke={s.color} strokeWidth={1} />;
        })}
        {months.map(({ d, i }) => (
          <text key={d} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "middle"} fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-body)">
            {new Date(`${d}T12:00:00`).toLocaleDateString("en-US", { month: "short" })}
          </text>
        ))}
        {hov != null && <line x1={x(hov)} x2={x(hov)} y1={PAD.t} y2={H - PAD.b} stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />}
      </svg>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-paper/60">
        {SERIES.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="inline-block size-2.5" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      {hov != null && (
        <div className="pointer-events-none absolute top-2 right-2 bg-ink/90 border border-white/10 px-3 py-2 text-xs tabular" style={{ minWidth: 150 }}>
          <p className="text-paper/60 mb-1">{fmtDate(data.dates[hov], true)}</p>
          {SERIES.map((s) => (
            <p key={s.key} className="flex justify-between gap-4">
              <span className="text-paper/80">{s.label}</span>
              <span>{data[s.key][hov].toLocaleString("en-US")}</span>
            </p>
          ))}
          <p className="flex justify-between gap-4 border-t border-white/10 mt-1 pt-1 font-semibold">
            <span>Total</span>
            <span>{stacks.apple[hov].toLocaleString("en-US")}</span>
          </p>
        </div>
      )}
    </div>
  );
}
