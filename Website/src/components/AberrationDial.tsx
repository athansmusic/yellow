"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ABERRATION_CLASSES, designationClasses } from "@/lib/aberrations";

export type DialItem = { slug: string; name: string; designation: string; subject?: string; episodeCode: string; episodeTitle?: string; teaser?: string };

type Filter = "ALL" | "P" | "S" | "C" | "Q" | "T" | "PENDING";

/**
 * CRT terminal for browsing the Unit's records. Dial a classification on the left, the matching
 * designations list out on the screen; select one to open its dossier.
 */
export function AberrationDial({ items }: { items: DialItem[] }) {
  const [filter, setFilter] = useState<Filter>("ALL");
  const [cursor, setCursor] = useState(0);
  const [typed, setTyped] = useState(0);

  const list = useMemo(() => {
    return items.filter((it) => {
      const cls = designationClasses(it.designation);
      if (filter === "ALL") return true;
      if (filter === "PENDING") return cls.length === 0;
      return cls.includes(filter);
    });
  }, [items, filter]);

  // Type the list out line by line when the dial changes
  useEffect(() => {
    setTyped(0);
    setCursor(0);
    let n = 0;
    const id = setInterval(() => {
      n += 1;
      setTyped(n);
      if (n >= list.length) clearInterval(id);
    }, 45);
    return () => clearInterval(id);
  }, [list]);

  const dials: { id: Filter; label: string; hint: string }[] = [
    { id: "ALL", label: "ALL", hint: "Every record" },
    ...(["P", "S", "C", "Q", "T"] as const).map((k) => ({ id: k as Filter, label: k, hint: ABERRATION_CLASSES[k] })),
    { id: "PENDING", label: "??", hint: "Pending or unknown" },
  ];
  const current = list[cursor];

  return (
    <div className="crt grid gap-0 lg:grid-cols-[14rem_1fr] border border-line bg-black">
      {/* Dial */}
      <div className="border-b lg:border-b-0 lg:border-r border-line p-4">
        <p className="crt-text text-[11px] tracking-[0.3em] uppercase opacity-70">Classification dial</p>
        <div className="mt-3 flex lg:flex-col flex-wrap gap-1" role="tablist" aria-label="Classification">
          {dials.map((d) => {
            const on = d.id === filter;
            return (
              <button key={d.id} type="button" role="tab" aria-selected={on} onClick={() => setFilter(d.id)} className={`crt-text text-left px-3 py-2 border ${on ? "border-yellow bg-yellow/10" : "border-line/60 hover:border-yellow/60"}`}>
                <span className="display text-2xl leading-none">{d.label}</span>
                <span className="block text-[10px] tracking-[0.2em] uppercase opacity-70 mt-0.5">{d.hint}</span>
              </button>
            );
          })}
        </div>
        <p className="crt-text mt-4 text-[10px] leading-relaxed opacity-60">
          AT = Aberrant Threat. Letters after AT give the classes: P physical, S spatial, C cognitive, Q quantum, T temporal.
        </p>
      </div>

      {/* Screen */}
      <div className="relative p-4 sm:p-6 min-h-[28rem]">
        <div className="crt-scan pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative crt-text">
          <p className="text-[11px] tracking-[0.3em] uppercase opacity-70">
            TRU records · {filter === "ALL" ? "all classes" : filter === "PENDING" ? "pending / unknown" : `class ${filter}: ${ABERRATION_CLASSES[filter]}`} · {list.length} record{list.length === 1 ? "" : "s"}
          </p>
          <ol className="mt-4 grid gap-px" role="listbox" aria-label="Records">
            {list.slice(0, typed).map((it, i) => {
              const cls = designationClasses(it.designation);
              const on = i === cursor;
              return (
                <li key={it.slug} role="option" aria-selected={on}>
                  <Link href={`/aberrations/${it.slug}`} onMouseEnter={() => setCursor(i)} onFocus={() => setCursor(i)} className={`grid grid-cols-[7.5rem_1fr_auto] sm:grid-cols-[9rem_1fr_auto] items-baseline gap-3 px-2 py-1.5 ${on ? "bg-yellow text-ink" : "hover:bg-yellow/10"}`}>
                    <span className="font-mono text-xs sm:text-sm tabular truncate">{it.designation.length > 14 ? it.designation.slice(0, 12) + "…" : it.designation}</span>
                    <span className="display text-xl truncate">{it.name}</span>
                    <span className={`text-[10px] tracking-[0.18em] uppercase ${on ? "text-ink/70" : "opacity-60"}`}>{cls.length ? cls.join("") : "?"}</span>
                  </Link>
                </li>
              );
            })}
            {typed < list.length && <li className="px-2 py-1.5 opacity-70">▌</li>}
            {list.length === 0 && <li className="px-2 py-1.5 opacity-70">No records under that class.</li>}
          </ol>

          {current && (
            <div className="mt-6 border-t border-line/60 pt-4 grid gap-1 text-sm">
              <p className="text-[11px] tracking-[0.3em] uppercase opacity-70">Selected</p>
              <p>
                <span className="font-mono">{current.designation}</span> · <span className="display text-2xl">{current.name}</span>
              </p>
              <p className="opacity-80">
                First encountered: {current.episodeCode}
                {current.episodeTitle ? ` (${current.episodeTitle})` : ""}
              </p>
              {current.teaser && <p className="opacity-80">{current.teaser}</p>}
              <Link href={`/aberrations/${current.slug}`} className="mt-2 inline-block btn btn-yellow !min-h-10 !text-base !px-4 w-max">
                Open dossier
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
