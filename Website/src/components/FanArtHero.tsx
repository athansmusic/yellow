"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { FanArt } from "@/lib/content";

const INTERVAL = 6000;

/** One piece in the spotlight, rotating through the newest few. Hover pauses (same manners as the store hero). */
export function FanArtHero({ items }: { items: FanArt[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || items.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % items.length), INTERVAL);
    return () => clearInterval(t);
  }, [paused, items.length]);
  const art = items[i];
  if (!art) return null;

  return (
    <div className="mt-10 border border-line bg-ink-2" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="grid lg:grid-cols-[minmax(0,1.2fr)_1fr]">
        <a href={art.postUrl || art.image} target="_blank" rel="noreferrer" className="block bg-ink">
          {/* key remounts the img so the fade replays on rotate */}
          <Image
            key={art.id}
            src={art.image}
            alt={art.title ? `${art.title}, by ${art.artist}` : `Fan art by ${art.artist}`}
            width={art.width || 1200}
            height={art.height || 900}
            sizes="(min-width:1024px) 55vw, 100vw"
            priority
            className="w-full h-72 sm:h-96 object-contain animate-[fadeIn_.5s_ease]"
          />
        </a>
        <div className="p-6 sm:p-8 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-line">
          <p className="eyebrow">Spotlight</p>
          {art.title && <h2 className="display text-3xl sm:text-4xl leading-tight mt-2 [overflow-wrap:anywhere] line-clamp-3">{art.title}</h2>}
          <p className={`text-muted ${art.title ? "mt-2 text-sm" : "display text-3xl mt-2 text-paper"}`}>by {art.artist || "unknown"}</p>
          <div className="mt-5">
            <a href={art.postUrl || art.image} target="_blank" rel="noreferrer" className="text-sm text-yellow underline underline-offset-4 hover:text-paper">
              See the original on Tumblr
            </a>
          </div>
          {items.length > 1 && (
            <ol className="mt-8 flex flex-wrap items-center gap-2" aria-label="Spotlight pieces">
              {items.map((it, n) => (
                <li key={it.id}>
                  <button type="button" onClick={() => setI(n)} aria-label={`Piece by ${it.artist}`} aria-current={n === i ? "true" : undefined} className={`block h-1.5 w-8 transition-colors ${n === i ? "bg-yellow" : "bg-line hover:bg-paper/50"}`} />
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
