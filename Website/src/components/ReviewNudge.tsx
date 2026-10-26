"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LISTEN } from "@/lib/site";
import { usePlayer } from "@/lib/player";
import { Close } from "./Icons";

/**
 * Asks for a review once, after ten minutes of actual listening.
 *
 * Time is accumulated from play/pause timestamps rather than a ticking interval: background tabs
 * throttle timers to about once a minute while the audio keeps playing, so an interval would
 * badly undercount exactly the listener we want to reach. Persisted, so the ten minutes can be
 * spread across visits, and asked at most once ever — dismissing or acting on it closes the door.
 */
const LISTENED_KEY = "tru-listened-seconds";
const ASKED_KEY = "tru-review-asked";
const THRESHOLD_SECONDS = 600;

const read = (k: string): string | null => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode: the nudge just never fires */
  }
};

export function ReviewNudge() {
  const { track, playing, expanded } = usePlayer();
  const [show, setShow] = useState(false);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (read(ASKED_KEY)) return;

    const banked = () => Number(read(LISTENED_KEY) ?? 0) || 0;
    // Re-checked on every tick, not just at effect start: dismissing does not re-run this
    // effect, so without it the interval below would put the nudge straight back on screen.
    const ask = () => {
      if (!read(ASKED_KEY)) setShow(true);
    };
    const flush = () => {
      if (startedAt.current == null) return banked();
      const total = banked() + (Date.now() - startedAt.current) / 1000;
      startedAt.current = Date.now();
      write(LISTENED_KEY, String(Math.round(total)));
      return total;
    };

    if (!playing) {
      flush();
      startedAt.current = null;
      return;
    }

    startedAt.current = Date.now();
    if (banked() >= THRESHOLD_SECONDS) ask();

    // Bank progress periodically so a reload mid-episode does not throw the time away.
    const t = setInterval(() => {
      if (flush() >= THRESHOLD_SECONDS) ask();
    }, 15000);
    return () => {
      clearInterval(t);
      flush();
      startedAt.current = null;
    };
  }, [playing]);

  const dismiss = () => {
    write(ASKED_KEY, "1");
    setShow(false);
  };

  if (!show || !track) return null;

  const card = (
    <div
      role="status"
      aria-live="polite"
      className={`border border-yellow/60 bg-ink-2 p-4 ${expanded ? "relative" : "fixed right-3 left-3 sm:left-auto sm:right-4 sm:max-w-sm z-40 bottom-[calc(var(--player-bar-h,4.5rem)+0.75rem)] shadow-lg"}`}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-2 right-2 p-1 text-muted hover:text-yellow"
      >
        <Close width={16} height={16} />
      </button>
      <p className="text-sm text-paper pr-6">Enjoying REDACTED? Consider leaving a review on the platform of your choice!</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={`${LISTEN.apple}?action=write-review`}
          target="_blank"
          rel="noreferrer"
          onClick={dismiss}
          className="btn btn-yellow !min-h-9 !px-3 !text-base"
        >
          Apple Podcasts
        </a>
        <a
          href={LISTEN.spotify}
          target="_blank"
          rel="noreferrer"
          onClick={dismiss}
          className="btn !min-h-9 !px-3 !text-base border border-line text-paper hover:border-yellow"
        >
          Spotify
        </a>
      </div>
    </div>
  );

  // Inside the popped-out card when it is open, above the bar otherwise.
  if (expanded) {
    const slot = typeof document === "undefined" ? null : document.getElementById("player-nudge-slot");
    return slot ? createPortal(<div className="px-5 pt-4">{card}</div>, slot) : null;
  }
  return card;
}
