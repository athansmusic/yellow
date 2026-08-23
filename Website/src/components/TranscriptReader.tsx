"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePlayer, type Track } from "@/lib/player";
import type { TranscriptLine } from "@/lib/curtain";

/**
 * Read-along transcript. Lines light up from the site player's position.
 * Timestamps are relative to the clean episode; the feed audio carries dynamic ads of unknown length,
 * so the listener taps "Sync to here" on the line being spoken to set the offset (per episode, remembered).
 */
export function TranscriptReader({ lines, track }: { lines: TranscriptLine[]; track: Track }) {
  const { track: current, time, playing, load, seek } = usePlayer();
  const isThis = current?.id === track.id;
  const key = `tru-sync-${track.id}`;
  const [offset, setOffset] = useState<number | null>(null); // player seconds minus transcript seconds
  const [follow, setFollow] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(key);
      if (v !== null) setOffset(Number(v));
    } catch {}
  }, [key]);

  // Which line is live, given the offset
  const activeIdx = useMemo(() => {
    if (!isThis || offset === null) return -1;
    const t = time - offset;
    let idx = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].start <= t) idx = i;
      else break;
    }
    return idx;
  }, [isThis, offset, time, lines]);

  // Keep the live line in view while following
  useEffect(() => {
    if (!follow || activeIdx < 0 || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-i="${activeIdx}"]`);
    if (!el) return;
    const box = listRef.current;
    const top = el.offsetTop - box.clientHeight / 2 + el.offsetHeight / 2;
    box.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
  }, [activeIdx, follow]);

  function syncTo(i: number) {
    if (!isThis) {
      load(track, true);
      return;
    }
    const o = time - lines[i].start;
    setOffset(o);
    try {
      localStorage.setItem(key, String(o));
    } catch {}
    setFollow(true);
  }

  function jumpTo(i: number) {
    if (!isThis) load(track, true);
    if (offset === null) return; // not synced yet: play only
    seek(Math.max(0, lines[i].start + offset));
    setFollow(true);
  }

  const synced = isThis && offset !== null;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted border-b border-line pb-3 mb-3">
        {!isThis ? (
          <button type="button" onClick={() => load(track, true)} className="text-yellow underline underline-offset-4">
            Play this episode to read along
          </button>
        ) : synced ? (
          <>
            <span className="text-yellow">Read-along on</span>
            <span>Lines light up as they play. Drifted after an ad? Tap the line being spoken and choose Sync.</span>
            {!follow && (
              <button type="button" onClick={() => setFollow(true)} className="underline underline-offset-4 hover:text-yellow">
                Follow along
              </button>
            )}
          </>
        ) : (
          <span>
            {playing ? "Playing. " : ""}Tap the line being spoken right now and choose <span className="text-paper">Sync to here</span>; the ads in the feed shift the timing, so this sets it.
          </span>
        )}
      </div>

      <div ref={listRef} onScroll={() => follow && activeIdx >= 0 && setFollow(false)} className="max-h-[70vh] overflow-y-auto pr-1">
        <ol className="grid gap-2 text-[15px]">
          {lines.map((l, i) => {
            const active = i === activeIdx;
            return (
              <li key={i} data-i={i} className={`group grid sm:grid-cols-[9rem_1fr] gap-x-4 rounded-sm px-2 py-1 -mx-2 transition-colors ${active ? "bg-yellow/10" : ""}`}>
                <span className={`display text-lg leading-tight sm:text-right ${active ? "text-yellow" : "text-yellow/80"}`}>{l.character}</span>
                <span className="min-w-0">
                  <span className={active ? "text-paper" : "text-paper/80"}>{l.text}</span>
                  <span className="ml-2 inline-flex gap-2 text-[11px] opacity-0 group-hover:opacity-100 focus-within:opacity-100">
                    {synced && (
                      <button type="button" onClick={() => jumpTo(i)} className="text-muted underline underline-offset-2 hover:text-yellow">
                        Play from here
                      </button>
                    )}
                    <button type="button" onClick={() => syncTo(i)} className="text-muted underline underline-offset-2 hover:text-yellow">
                      {isThis ? "Sync to here" : "Play"}
                    </button>
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
