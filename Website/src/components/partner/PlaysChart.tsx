"use client";

import { useMemo, useState } from "react";
import type { PlaysSeries, SeasonMarks } from "@/lib/partnerStats";

const SERIES = [
  { key: "apple", label: "Apple Podcasts", color: "#FFF200" },
  { key: "spotify", label: "Spotify", color: "#C87800" },
  { key: "acast", label: "Other apps", color: "#963C00" },
  { key: "youtube", label: "YouTube", color: "#501E00" },
] as const;

// Window sizes in days. "All" is the whole run and the default; the others zoom to the most recent stretch.
const RANGES = [
  ["all", "All", 0],
  ["year", "Year", 365],
  ["quarter", "Quarter", 90],
  ["month", "Month", 30],
] as const;

const W = 600;
const H = 280;
// The top margin holds the airing / between-seasons ribbon.
const PAD = { t: 30, r: 8, b: 26, l: 40 };

const fmtDate = (iso: string, long = false) => new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", long ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });

/** Stacked area chart of daily plays, same shape and palette as the original Chart.js version. */
export function PlaysChart({ data: all, marks }: { data: PlaysSeries; marks?: SeasonMarks }) {
  const [hov, setHov] = useState<number | null>(null);
  const [range, setRange] = useState<(typeof RANGES)[number][0]>("all");

  // The chosen window, taken from the end of the series. A window longer than the data is just all of it.
  const data = useMemo<PlaysSeries>(() => {
    const days = RANGES.find((r) => r[0] === range)![2];
    const from = days ? Math.max(0, all.dates.length - days) : 0;
    if (!from) return all;
    return { dates: all.dates.slice(from), apple: all.apple.slice(from), spotify: all.spotify.slice(from), acast: all.acast.slice(from), youtube: all.youtube.slice(from) };
  }, [all, range]);
  const n = data.dates.length;

  const { paths, max, stacks } = useMemo(() => {
    const n = data.dates.length;
    // Stack top-down in the order Apple, Spotify, Acast apps, YouTube (each series sits on the ones after it)
    const order = ["youtube", "acast", "spotify", "apple"] as const;
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

  // Where the show was airing and where it was between seasons, clipped to the visible window.
  const first = data.dates[0];
  const last = data.dates[n - 1];
  const idxFrom = (iso: string) => {
    const i = data.dates.findIndex((d) => d >= iso);
    return i === -1 ? n - 1 : i;
  };
  const idxTo = (iso: string) => {
    let j = -1;
    for (let i = 0; i < n; i++) if (data.dates[i] <= iso) j = i;
    return j;
  };
  const bands: { kind: "air" | "break"; label: string; a: number; b: number }[] = [];
  for (const se of marks?.seasons ?? []) {
    if (se.end < first || se.start > last) continue;
    bands.push({ kind: "air", label: `${se.label} airing`, a: idxFrom(se.start), b: Math.max(idxTo(se.end), idxFrom(se.start)) });
  }
  if (marks?.gapFrom && marks.gapFrom < last) bands.push({ kind: "break", label: "Between seasons", a: Math.min(idxTo(marks.gapFrom) + 1, n - 1), b: n - 1 });
  const releaseOn = new Map((marks?.releases ?? []).map((r) => [r.date, r.title]));
  const ticks_ = data.dates.map((d, i) => ({ d, i })).filter(({ d }) => releaseOn.has(d));
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  // Axis labels: the first day of each month in a long window, evenly spaced dates in a short one
  const daily = n <= 45;
  const step = Math.ceil(n / 6);
  const months = data.dates.map((d, i) => ({ d, i })).filter(({ d, i }) => (daily ? i % step === 0 : i === 0 || d.slice(0, 7) !== data.dates[i - 1].slice(0, 7)));

  return (
    <div className="relative">
      <div role="group" aria-label="Time range" className="mb-3 flex gap-1.5">
        {RANGES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            aria-pressed={range === key}
            onClick={() => {
              setRange(key);
              setHov(null);
            }}
            className={`border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors ${range === key ? "border-yellow bg-yellow text-ink" : "border-white/15 text-paper/60 hover:border-white/40 hover:text-paper"}`}
          >
            {label}
          </button>
        ))}
      </div>
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
        {bands.map((b) => {
          const x1 = x(b.a);
          const x2 = Math.max(x(b.b), x1 + 2);
          const air = b.kind === "air";
          return (
            <g key={`${b.kind}-${b.a}`}>
              <rect x={x1} y={PAD.t} width={x2 - x1} height={H - PAD.t - PAD.b} fill={air ? "#FFF200" : "#ffffff"} fillOpacity={air ? 0.07 : 0.035} />
              <rect x={x1} y={PAD.t - 7} width={x2 - x1} height={2} fill={air ? "#FFF200" : "rgba(255,255,255,0.3)"} />
              <text x={air ? x1 + 3 : x2 - 3} textAnchor={air ? "start" : "end"} y={PAD.t - 12} fontSize="8.5" fontWeight={600} letterSpacing="0.8" fill={air ? "#FFF200" : "rgba(255,255,255,0.55)"} fontFamily="var(--font-body)" style={{ textTransform: "uppercase" }}>
                {b.label}
              </text>
              {!air && <line x1={x1} x2={x1} y1={PAD.t - 7} y2={H - PAD.b} stroke="rgba(255,255,255,0.35)" strokeDasharray="3 3" />}
            </g>
          );
        })}
        {["youtube", "acast", "spotify", "apple"].map((k) => {
          const s = SERIES.find((s) => s.key === k)!;
          return <path key={k} d={paths[k]} fill={s.color} fillOpacity={0.8} stroke={s.color} strokeWidth={1} />;
        })}
        {months.map(({ d, i }) => (
          <text key={d} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : "middle"} fontSize="9" fill="rgba(255,255,255,0.45)" fontFamily="var(--font-body)">
            {new Date(`${d}T12:00:00`).toLocaleDateString("en-US", daily ? { month: "short", day: "numeric" } : { month: "short" })}
          </text>
        ))}
        {ticks_.map(({ d, i }) => (
          <line key={d} x1={x(i)} x2={x(i)} y1={H - PAD.b} y2={H - PAD.b + 5} stroke="rgba(255,255,255,0.6)" strokeWidth={1.2} />
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
        {marks && (
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-px bg-white/60" />
            Episode release
          </span>
        )}
      </div>

      {hov != null && (
        <div className="pointer-events-none absolute top-2 right-2 bg-ink/90 border border-white/10 px-3 py-2 text-xs tabular" style={{ minWidth: 150 }}>
          <p className="text-paper/60 mb-1">{fmtDate(data.dates[hov], true)}</p>
          {releaseOn.get(data.dates[hov]) && <p className="mb-1 text-yellow">New episode: {releaseOn.get(data.dates[hov])}</p>}
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
