"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { LIVESTREAM, isLive } from "@/lib/schedule";
import { usePlayer } from "@/lib/player";
import { Close, Twitch } from "./Icons";

type Live = { configured: boolean; live: boolean; title?: string; startedAt?: string; viewers?: number; channel: string };

const POLL_MS = 90_000;
const DISMISS_KEY = "live-dismissed";

/**
 * Site-wide "we're live" dock. Polls /api/live; when the Twitch channel is live it shows a muted
 * embed in the corner with the stream title. Minimises to a red pill; dismissing hides it for that stream.
 * Without Twitch credentials it falls back to the Thursday schedule window and links out instead of embedding.
 */
export function LiveDock() {
  const pathname = usePathname();
  const { track } = usePlayer();
  const [state, setState] = useState<Live | null>(null);
  const [min, setMin] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.hostname);
    setDismissed(sessionStorage.getItem(DISMISS_KEY));
    let stop = false;
    const tick = async () => {
      try {
        const preview = new URLSearchParams(window.location.search).has("livepreview");
        const r = await fetch(`/api/live${preview ? "?preview=1" : ""}`, { cache: "no-store" });
        const j = (await r.json()) as Live;
        if (!stop) setState(j);
      } catch {}
    };
    tick();
    const id = setInterval(() => document.visibilityState === "visible" && tick(), POLL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  if (!state || pathname.startsWith("/checkout")) return null;

  // Real detection when configured; otherwise the schedule window, link-only
  const scheduled = !state.configured && isLive(LIVESTREAM);
  const live = state.live || scheduled;
  if (!live) return null;
  const key = state.startedAt ?? "scheduled";
  if (dismissed === key) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, key);
    setDismissed(key);
  };
  const bottom = track ? "bottom-24" : "bottom-4";

  if (min || scheduled) {
    return (
      <div className={`fixed right-4 ${bottom} z-40 flex items-center gap-1`}>
        <a href={LIVESTREAM.url} target="_blank" rel="noreferrer" onClick={scheduled ? undefined : (e) => (e.preventDefault(), setMin(false))} className="inline-flex items-center gap-2 bg-red text-white font-bold text-sm uppercase tracking-wider px-4 py-2.5 shadow-[0_10px_30px_rgba(0,0,0,.6)] hover:bg-red-2">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-white opacity-75 animate-ping" />
            <span className="relative inline-flex size-2.5 rounded-full bg-white" />
          </span>
          Live now
          <Twitch width={16} height={16} />
        </a>
        <button type="button" onClick={dismiss} aria-label="Hide live notice" className="bg-ink-2 border border-line text-muted hover:text-paper p-2.5">
          <Close width={14} height={14} />
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Live stream" className={`fixed right-4 ${bottom} z-40 w-[min(22rem,calc(100vw-2rem))] bg-ink-2 border border-line shadow-[0_20px_50px_rgba(0,0,0,.7)]`}>
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-line">
        <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-red-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full rounded-full bg-red-2 opacity-75 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-red-2" />
          </span>
          Live on Twitch
          {state.viewers != null && <span className="text-muted font-medium normal-case tracking-normal">· {state.viewers.toLocaleString("en-US")} watching</span>}
        </p>
        <div className="flex items-center">
          <button type="button" onClick={() => setMin(true)} aria-label="Minimise" className="p-1.5 text-muted hover:text-paper">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" aria-hidden>
              <path d="M5 12h14" />
            </svg>
          </button>
          <button type="button" onClick={dismiss} aria-label="Hide for this stream" className="p-1.5 text-muted hover:text-paper">
            <Close width={14} height={14} />
          </button>
        </div>
      </div>
      {host && (
        <div className="aspect-video bg-black">
          <iframe
            src={`https://player.twitch.tv/?channel=${encodeURIComponent(state.channel)}&parent=${encodeURIComponent(host)}&muted=true&autoplay=true`}
            title={`${state.channel} live on Twitch`}
            allow="autoplay; fullscreen"
            allowFullScreen
            className="w-full h-full"
          />
        </div>
      )}
      <div className="px-3 py-2.5 flex items-center justify-between gap-3">
        <p className="text-sm text-paper/90 truncate" title={state.title}>
          {state.title || "New episode premiere"}
        </p>
        <a href={LIVESTREAM.url} target="_blank" rel="noreferrer" className="shrink-0 inline-flex items-center gap-1.5 bg-[#9146FF] hover:bg-[#a970ff] text-white text-xs font-bold uppercase tracking-wider px-3 py-2">
          <Twitch width={14} height={14} /> Open
        </a>
      </div>
    </aside>
  );
}
