"use client";

import Image from "next/image";
import Link from "next/link";
import { fmtTime, usePlayer } from "@/lib/player";
import { useEffect } from "react";
import { Close, Pause, Play } from "./Icons";

const RATES = [1, 1.25, 1.5, 2];

export function PlayerBar() {
  const { track, playing, time, duration, rate, toggle, seek, skip, setRate, close } = usePlayer();
  // Other bottom bars (sticky add-to-cart, StickyStart) sit on top of the player via --player-h.
  useEffect(() => {
    const root = document.documentElement;
    if (track) root.style.setProperty("--player-h", "var(--player-bar-h)");
    else root.style.removeProperty("--player-h");
    return () => {
      root.style.removeProperty("--player-h");
    };
  }, [track]);
  if (!track) return null;
  const pct = duration ? (time / duration) * 100 : 0;

  return (
    <div role="region" aria-label="Now playing" className="fixed inset-x-0 bottom-0 z-40 bg-ink-2/95 backdrop-blur border-t border-line text-paper pb-[env(safe-area-inset-bottom)]">
      {/* Seek bar across the top edge */}
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={1}
        value={time}
        onChange={(e) => seek(Number(e.target.value))}
        aria-label="Seek"
        aria-valuetext={`${fmtTime(time)} of ${fmtTime(duration)}`}
        className="absolute -top-1.5 left-0 w-full h-3 accent-yellow cursor-pointer opacity-90"
        style={{ background: `linear-gradient(to right, var(--color-yellow) ${pct}%, var(--color-line) ${pct}%)` }}
      />
      <div className="mx-auto max-w-7xl px-3 sm:px-6 h-16 sm:h-[4.5rem] flex items-center gap-3">
        {track.image && (
          <Link href={track.href ?? "#"} className="shrink-0">
            <Image src={track.image} alt="" width={48} height={48} className="size-11 sm:size-12 object-cover bg-ink" />
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <Link href={track.href ?? "#"} className="display text-lg sm:text-xl leading-none block truncate hover:text-yellow">
            {track.title}
          </Link>
          <p className="text-[11px] sm:text-xs text-muted truncate tabular">
            {track.subtitle ? `${track.subtitle} · ` : ""}
            {fmtTime(time)} / {fmtTime(duration)}
          </p>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button type="button" onClick={() => skip(-15)} aria-label="Back 15 seconds" className="hidden sm:grid size-10 place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
            −15
          </button>
          <button type="button" onClick={() => toggle()} aria-label={playing ? "Pause" : "Play"} className="size-11 sm:size-12 rounded-full bg-yellow text-ink grid place-items-center hover:bg-white">
            {playing ? <Pause width={22} height={22} /> : <Play width={22} height={22} />}
          </button>
          <button type="button" onClick={() => skip(30)} aria-label="Forward 30 seconds" className="hidden sm:grid size-10 place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
            +30
          </button>
          <button
            type="button"
            onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
            aria-label={`Playback speed ${rate}x, change`}
            className="hidden xs:grid min-w-12 h-10 place-items-center border border-line text-xs font-bold tabular hover:border-yellow"
          >
            {rate}×
          </button>
          <button type="button" onClick={close} aria-label="Close player" className="size-10 grid place-items-center text-muted hover:text-paper">
            <Close width={18} height={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Bottom spacer so page content isn't hidden under the bar. */
export function PlayerSpacer() {
  const { track } = usePlayer();
  return track ? <div aria-hidden className="h-20" /> : null;
}
