"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { awards, isWin } from "@/lib/awards";

const WINS = awards.filter(isWin);
const REST = awards.filter((a) => !isWin(a));

const alt = (a: (typeof awards)[number]) => `${a.festival}: ${[a.result, a.year].filter(Boolean).join(", ")}`;

function Laurel({ a, className }: { a: (typeof awards)[number]; className: string }) {
  const img = <Image src={`/laurels/${a.file}.png`} alt={alt(a)} title={`${a.festival}: ${a.result}`} width={140} height={140} sizes="(min-width: 640px) 96px, 64px" className={`${className} w-auto transition-opacity group-hover:opacity-100`} />;
  return a.url ? (
    <a href={a.url} target="_blank" rel="noopener noreferrer" className="group block">
      {img}
    </a>
  ) : (
    img
  );
}

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
      {/* Every award, weighted: the wins large and bright, the nominations and selections smaller and quieter beneath */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-7 pb-4" role="group" aria-label={`Awards and wins: ${awards.map((a) => `${a.result}, ${[a.festival, a.year].filter(Boolean).join(" ")}`).join("; ")}`}>
        <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-5 sm:gap-x-10">
          {WINS.map((a) => (
            <li key={a.file}>
              <Laurel a={a} className="h-16 sm:h-24 opacity-95" />
            </li>
          ))}
        </ul>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-4 sm:gap-x-7">
          {REST.map((a) => (
            <li key={a.file}>
              <Laurel a={a} className="h-9 sm:h-12 opacity-60" />
            </li>
          ))}
        </ul>
        <p className="mt-5 text-center text-[11px] font-semibold uppercase tracking-[0.18em]">
          <Link href="/partner#awards-strip" className="text-yellow hover:underline underline-offset-4">
            See all awards
          </Link>
        </p>
      </div>

      {/* Rotating press quote */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 pb-6 flex flex-col sm:flex-row items-center gap-5">
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
