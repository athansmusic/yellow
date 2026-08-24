"use client";

import Image from "next/image";
import Link from "next/link";
import { fmtTime, usePlayer } from "@/lib/player";
import { useEffect } from "react";
import { Close, Expand, Pause, Play, SkipNext, SkipPrev } from "./Icons";

const RATES = [1, 1.25, 1.5, 2];

export function PlayerBar() {
  const { track, playing, time, duration, rate, neighbors, expanded, setExpanded, jump, toggle, seek, skip, setRate, close } = usePlayer();
  // Other bottom bars (sticky add-to-cart, StickyStart) sit on top of the player via --player-h.
  useEffect(() => {
    const root = document.documentElement;
    if (track) root.style.setProperty("--player-h", "var(--player-bar-h)");
    else root.style.removeProperty("--player-h");
    return () => {
      root.style.removeProperty("--player-h");
    };
  }, [track]);
  // The expanded card owns the screen: lock page scroll and close on Escape
  useEffect(() => {
    if (!expanded) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setExpanded(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded, setExpanded]);
  if (!track) return null;
  const pct = duration ? (time / duration) * 100 : 0;

  const seekBar = (cls: string) => (
    <input
      type="range"
      min={0}
      max={duration || 0}
      step={1}
      value={time}
      onChange={(e) => seek(Number(e.target.value))}
      aria-label="Seek"
      aria-valuetext={`${fmtTime(time)} of ${fmtTime(duration)}`}
      className={cls}
      style={{ background: `linear-gradient(to right, var(--color-yellow) ${pct}%, var(--color-line) ${pct}%)` }}
    />
  );
  const jumpBtn = (dir: "prev" | "next", cls: string, iconSize: number) => {
    const I = dir === "prev" ? SkipPrev : SkipNext;
    return (
      <button
        type="button"
        onClick={() => jump(dir)}
        disabled={!neighbors[dir]}
        aria-label={dir === "prev" ? "Previous episode" : "Next episode"}
        title={neighbors[dir]?.title}
        className={`${cls} disabled:opacity-30 disabled:cursor-default`}
      >
        <I width={iconSize} height={iconSize} />
      </button>
    );
  };

  return (
    <>
      {/* Expanded now-playing card */}
      {expanded && (
        <div role="dialog" aria-modal="true" aria-label="Now playing" className="fixed inset-0 z-50 grid place-items-center p-4 bg-black/80 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && setExpanded(false)}>
          <div className="w-full max-w-sm sm:max-w-md bg-ink-2 border border-line shadow-[0_30px_80px_rgba(0,0,0,.8)]">
            <div className="flex items-center justify-between px-5 pt-4">
              <p className="eyebrow">Now playing</p>
              <button type="button" onClick={() => setExpanded(false)} aria-label="Collapse player" className="p-2 -m-2 text-muted hover:text-paper">
                <Close width={20} height={20} />
              </button>
            </div>
            <div className="px-5 pt-4 pb-6">
              {track.image && (
                <Link href={track.href ?? "#"} onClick={() => setExpanded(false)} className="block mx-auto w-56 sm:w-64">
                  <Image src={track.image} alt="" width={512} height={512} className="w-full aspect-square object-cover bg-ink border border-line" />
                </Link>
              )}
              <div className="mt-5 text-center">
                <Link href={track.href ?? "#"} onClick={() => setExpanded(false)} className="display text-3xl leading-tight block hover:text-yellow [overflow-wrap:anywhere]">
                  {track.title}
                </Link>
                {track.subtitle && <p className="mt-1 text-sm text-muted">{track.subtitle}</p>}
              </div>
              <div className="mt-6">
                {seekBar("w-full h-2 accent-yellow cursor-pointer")}
                <div className="mt-1 flex justify-between text-[11px] text-muted tabular">
                  <span>{fmtTime(time)}</span>
                  <span>-{fmtTime(Math.max(0, duration - time))}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2">
                {jumpBtn("prev", "size-11 grid place-items-center text-paper hover:text-yellow", 22)}
                <button type="button" onClick={() => skip(-15)} aria-label="Back 15 seconds" className="size-10 grid place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
                  −15
                </button>
                <button type="button" onClick={() => toggle()} aria-label={playing ? "Pause" : "Play"} className="size-14 rounded-full bg-yellow text-ink grid place-items-center hover:bg-white">
                  {playing ? <Pause width={26} height={26} /> : <Play width={26} height={26} />}
                </button>
                <button type="button" onClick={() => skip(30)} aria-label="Forward 30 seconds" className="size-10 grid place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
                  +30
                </button>
                {jumpBtn("next", "size-11 grid place-items-center text-paper hover:text-yellow", 22)}
              </div>
              <div className="mt-4 flex items-center justify-center gap-4 text-xs">
                <button type="button" onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])} aria-label={`Playback speed ${rate}x, change`} className="min-w-12 h-8 px-2 grid place-items-center border border-line font-bold tabular hover:border-yellow">
                  {rate}×
                </button>
                {track.href && (
                  <Link href={track.href} onClick={() => setExpanded(false)} className="text-muted underline underline-offset-4 hover:text-yellow">
                    Episode page
                  </Link>
                )}
                {neighbors.next && (
                  <span className="text-muted truncate max-w-40" title={neighbors.next.title}>
                    Next: {neighbors.next.title}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div role="region" aria-label="Now playing" className="fixed inset-x-0 bottom-0 z-40 bg-ink-2/95 backdrop-blur border-t border-line text-paper pb-[env(safe-area-inset-bottom)]">
        {/* Seek bar across the top edge */}
        {seekBar("absolute -top-1.5 left-0 w-full h-3 accent-yellow cursor-pointer opacity-90")}
        <div className="mx-auto max-w-7xl px-3 sm:px-6 h-16 sm:h-[4.5rem] flex items-center gap-3">
          {track.image && (
            <button type="button" onClick={() => setExpanded(true)} aria-label="Expand player" className="shrink-0 group relative">
              <Image src={track.image} alt="" width={48} height={48} className="size-11 sm:size-12 object-cover bg-ink" />
              <span className="absolute inset-0 grid place-items-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity">
                <Expand width={16} height={16} />
              </span>
            </button>
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
            {jumpBtn("prev", "hidden xs:grid size-9 sm:size-10 place-items-center text-muted hover:text-yellow", 18)}
            <button type="button" onClick={() => skip(-15)} aria-label="Back 15 seconds" className="hidden sm:grid size-10 place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
              −15
            </button>
            <button type="button" onClick={() => toggle()} aria-label={playing ? "Pause" : "Play"} className="size-11 sm:size-12 rounded-full bg-yellow text-ink grid place-items-center hover:bg-white">
              {playing ? <Pause width={22} height={22} /> : <Play width={22} height={22} />}
            </button>
            <button type="button" onClick={() => skip(30)} aria-label="Forward 30 seconds" className="hidden sm:grid size-10 place-items-center text-muted hover:text-yellow text-xs font-bold tabular">
              +30
            </button>
            {jumpBtn("next", "hidden xs:grid size-9 sm:size-10 place-items-center text-muted hover:text-yellow", 18)}
            <button
              type="button"
              onClick={() => setRate(RATES[(RATES.indexOf(rate) + 1) % RATES.length])}
              aria-label={`Playback speed ${rate}x, change`}
              className="hidden sm:grid min-w-12 h-10 place-items-center border border-line text-xs font-bold tabular hover:border-yellow"
            >
              {rate}×
            </button>
            <button type="button" onClick={close} aria-label="Close player" className="size-10 grid place-items-center text-muted hover:text-paper">
              <Close width={18} height={18} />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

/** Bottom spacer so page content isn't hidden under the bar. */
export function PlayerSpacer() {
  const { track } = usePlayer();
  return track ? <div aria-hidden className="h-20" /> : null;
}
