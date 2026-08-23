"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { EXTERNAL } from "@/lib/site";
import awards from "@/data/awards.json";

const LAURELS = awards.map((a) => `/laurels/${a.file}.png`);

type Quote = { quote: string; who: string; outlet: string; url?: string };

export function AwardsStrip({ quotes }: { quotes: Quote[] }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || quotes.length < 2) return;
    const id = setInterval(() => setI((x) => (x + 1) % quotes.length), 7000);
    return () => clearInterval(id);
  }, [paused, quotes.length]);

  const q = quotes[i];

  return (
    <div className="border-b border-line bg-ink-2/80 overflow-hidden">
      {/* Laurel marquee: two copies so the loop is seamless */}
      <div className="group relative py-5" aria-label="Festival selections and awards" role="img">
        <div className="absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-ink-2 to-transparent z-10" aria-hidden />
        <div className="absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-ink-2 to-transparent z-10" aria-hidden />
        <div className="flex w-max gap-10 marquee group-hover:[animation-play-state:paused]">
          {[...LAURELS, ...LAURELS].map((src, k) => (
            <Image key={k} src={src} alt="" width={150} height={84} className="h-12 sm:h-16 w-auto opacity-85 shrink-0" aria-hidden={k >= LAURELS.length} />
          ))}
        </div>
      </div>

      {/* Goodpods + rotating quote */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-6 flex flex-col sm:flex-row items-center gap-5">
        <a href={EXTERNAL.goodpods} target="_blank" rel="noreferrer" className="shrink-0">
          <Image src="/home/goodpods.png" alt="#1 audio drama of the week on Goodpods" width={200} height={66} className="h-12 w-auto" />
        </a>
        <div
          className="flex-1 min-h-[3.5rem] text-center sm:text-left"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <blockquote key={i} className="quote-in text-sm sm:text-base text-paper/90">
            “{q.quote}”
            <footer className="mt-1 text-xs text-muted">
              {q.who}, {q.url ? <a href={q.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-yellow">{q.outlet}</a> : q.outlet}
            </footer>
          </blockquote>
        </div>
        {quotes.length > 1 && (
          <div className="flex gap-1.5 shrink-0" role="tablist" aria-label="Quotes">
            {quotes.map((_, k) => (
              <button key={k} type="button" role="tab" aria-selected={k === i} aria-label={`Quote ${k + 1}`} onClick={() => setI(k)} className={`size-2.5 rounded-full ${k === i ? "bg-yellow" : "bg-line hover:bg-muted"}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
