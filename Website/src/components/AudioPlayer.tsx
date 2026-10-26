"use client";

import { fmtTime, usePlayer, type Track } from "@/lib/player";
import { Pause, Play } from "./Icons";

type Props = { track: Track; size?: "sm" | "md" | "lg"; label?: string; className?: string; onYellow?: boolean; plain?: boolean };

/**
 * Play button that hands the episode to the global, persistent player.
 * Shows resume progress if the listener has started this one before.
 */
export function PlayButton({ track, size = "md", label, className = "", onYellow = false, plain = false }: Props) {
  const { track: cur, playing, toggle, progressFor, time, duration } = usePlayer();
  const isCur = cur?.id === track.id;
  const active = isCur && playing;
  const prog = progressFor(track.id);
  const remaining = isCur && duration ? duration - time : undefined;

  const dim = size === "lg" ? "size-14" : size === "sm" ? "size-11" : "size-12";
  const ic = size === "lg" ? 26 : size === "sm" ? 18 : 22;

  if (plain) {
    return (
      <button type="button" onClick={() => toggle(track)} aria-label={`${active ? "Pause" : isCur ? "Resume" : "Play"} ${track.title}`} className={className}>
        {active ? <Pause width={20} height={20} /> : <Play width={20} height={20} />}
        {label ?? (active ? "Pause" : "Play")}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggle(track)}
      aria-label={`${active ? "Pause" : isCur ? "Resume" : "Play"} ${track.title}`}
      className={`group inline-flex items-center gap-3 ${className}`}
    >
      <span className={`relative ${dim} rounded-full grid place-items-center shrink-0 ${onYellow ? "bg-ink text-yellow" : "bg-yellow text-ink group-hover:bg-white"}`}>
        {prog > 0 && prog < 0.98 && (
          <svg className="absolute inset-0 -rotate-90" viewBox="0 0 36 36" aria-hidden>
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--color-ink)" strokeOpacity="0.25" strokeWidth="2.5" />
            <circle cx="18" cy="18" r="16.5" fill="none" stroke="var(--color-ink)" strokeWidth="2.5" strokeDasharray={`${prog * 103.7} 103.7`} />
          </svg>
        )}
        {active ? <Pause width={ic} height={ic} /> : <Play width={ic} height={ic} />}
      </span>
      {(label || size !== "sm") && (
        <span className="text-left">
          <span className="display text-xl leading-none block">{label ?? (active ? "Pause" : prog > 0 && prog < 0.98 ? "Resume" : "Play episode")}</span>
          {remaining != null && <span className="text-xs text-muted tabular block">{fmtTime(remaining)} left</span>}
        </span>
      )}
    </button>
  );
}

/** Kept for backwards-compat with earlier pages: a boxed play control. */
export function AudioPlayer({ src, title, id, image, href, subtitle }: { src: string; title: string; id?: string; image?: string; href?: string; subtitle?: string }) {
  return (
    <div className="bg-ink-2 border border-line p-3 sm:p-4">
      <PlayButton track={{ id: id ?? src, title, src, image, href, subtitle }} />
    </div>
  );
}
