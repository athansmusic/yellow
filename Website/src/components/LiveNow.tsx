"use client";

import { useEffect, useState } from "react";
import { LIVESTREAM, isLive, nextStart } from "@/lib/schedule";
import { Twitch } from "./Icons";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/**
 * "Catch it a day early": the Thursday live premiere on Twitch. Big countdown, Twitch purple,
 * and it flips to a red "live now" state during the stream window.
 */
export function EarlyAccess() {
  const now = useClock();
  const live = now ? isLive(LIVESTREAM, now) : false;
  const next = now ? nextStart(LIVESTREAM, now) : null;
  const left = next && now ? parts(next.getTime() - now.getTime()) : null;
  const tonight = left && left.d === 0;

  return (
    <section className={`relative overflow-hidden border-y border-line ${live ? "bg-red" : "bg-[#120b1f]"}`}>
      {/* Twitch purple wash + scanlines */}
      {!live && <div aria-hidden className="absolute inset-0 bg-[radial-gradient(80%_120%_at_15%_50%,rgba(145,70,255,.55),transparent_60%),radial-gradient(60%_100%_at_95%_0%,rgba(145,70,255,.25),transparent_60%)]" />}
      <div aria-hidden className="absolute inset-0 opacity-[0.08] bg-[repeating-linear-gradient(0deg,transparent_0_3px,#fff_3px_4px)]" />
      <div aria-hidden className="absolute -left-10 -bottom-16 text-[22rem] leading-none font-black text-white/[0.04] select-none display">LIVE</div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-16 grid gap-10 lg:grid-cols-[1fr_auto] items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-white">
            <span className="relative flex size-2.5">
              <span className={`absolute inline-flex h-full w-full rounded-full ${live ? "bg-white" : "bg-[#bf94ff]"} opacity-75 animate-ping`} />
              <span className={`relative inline-flex size-2.5 rounded-full ${live ? "bg-white" : "bg-[#bf94ff]"}`} />
            </span>
            {live ? "Live right now" : tonight ? "Tonight · 9/8c on Twitch" : "Thursdays · 9/8c · Live on Twitch"}
          </p>
          <h2 className="display text-5xl sm:text-7xl mt-3 text-white">{live ? "We're live." : "Catch it a day early."}</h2>
          <p className="mt-4 max-w-prose text-white/85 text-lg">Every new episode premieres live on Twitch on Thursday night, a full day before it hits the feed.</p>

          {!live && left && (
            <div className="mt-7 flex gap-3 sm:gap-5" aria-label="Time until the next live premiere">
              {(
                [
                  ["d", "days"],
                  ["h", "hours"],
                  ["m", "min"],
                  ["s", "sec"],
                ] as const
              ).map(([k, label]) => (
                <div key={k} className="min-w-[4.2rem] sm:min-w-[5.5rem] border border-white/15 bg-black/30 px-2 py-3 text-center">
                  <p className="display text-4xl sm:text-6xl text-white tabular">{String(left[k]).padStart(2, "0")}</p>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/60 mt-1">{label}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-stretch gap-3 lg:min-w-[18rem]">
          <a
            href={LIVESTREAM.url}
            target="_blank"
            rel="noreferrer"
            className={`btn !text-2xl justify-center whitespace-nowrap ${live ? "bg-white text-ink hover:bg-yellow" : "bg-[#9146FF] text-white hover:bg-[#a970ff] shadow-[0_0_40px_rgba(145,70,255,.45)]"}`}
          >
            <Twitch /> {live ? "Watch live" : "Follow on Twitch"}
          </a>
          <p className="text-center text-xs text-white/60">twitch.tv/{LIVESTREAM.url.split("/").pop()}</p>
        </div>
      </div>
    </section>
  );
}
