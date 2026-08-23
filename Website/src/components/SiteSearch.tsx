"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { SearchItem } from "@/app/api/search-index/route";
import { Close, Search as SearchIcon } from "./Icons";

const OPEN_EVENT = "open-site-search";
export const openSearch = () => window.dispatchEvent(new Event(OPEN_EVENT));

const TYPE_LABEL: Record<SearchItem["type"], string> = { episode: "Episode", postmortem: "Postmortem", minisode: "Minisode", cast: "Cast", aberration: "Aberration", like: "If you like", faq: "FAQ", product: "Store", page: "Page" };
const TYPE_RANK: Record<SearchItem["type"], number> = { cast: 0, aberration: 0, episode: 1, postmortem: 2, minisode: 2, product: 2, like: 2, faq: 2, page: 3 };
const SUGGEST = ["Nightfisher", "Trevor Henderson", "hoodie", "Postmortem"];

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Score one item: title/name hits first, exact phrase bonus, summary-ish fields last. Returns [score, matchedLabel]. */
function score(it: SearchItem, q: string): [number, string] {
  const terms = norm(q).split(/\s+/).filter(Boolean);
  if (!terms.length) return [0, ""];
  let best = 0;
  let label = "";
  const phrase = norm(q);
  it.fields.forEach(([lab, text]) => {
    if (!text) return;
    const h = norm(text);
    const weight = /^(title|name|guest director|character|question)$/.test(lab) ? 10 : /^(summary|bio|description|answer|about|teaser)$/.test(lab) ? 1 : 4;
    let s = 0;
    if (h === phrase) s = 40;
    else if (h.includes(phrase)) s = 20;
    for (const t of terms) {
      if (h.startsWith(t)) s += 6;
      else if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`).test(h)) s += 4;
      else if (h.includes(t)) s += 1;
    }
    const total = s * weight;
    if (total > best) {
      best = total;
      label = lab;
    }
  });
  // every term must appear somewhere in the item
  const all = norm(it.fields.map((f) => f[1]).join(" "));
  if (!terms.every((t) => all.includes(t))) return [0, ""];
  return [best - TYPE_RANK[it.type] * 5, label];
}

export function useSearchIndex() {
  const [index, setIndex] = useState<SearchItem[] | null>(null);
  useEffect(() => {
    let on = true;
    fetch("/api/search-index")
      .then((r) => r.json())
      .then((j: SearchItem[]) => on && setIndex(j))
      .catch(() => on && setIndex([]));
    return () => {
      on = false;
    };
  }, []);
  return index;
}

/** The search UI itself: input, type-ahead results, empty and zero states. Used by the overlay and the /search page. */
export function SearchPanel({ initial = "", autoFocus = true, onNavigate }: { initial?: string; autoFocus?: boolean; onNavigate?: () => void }) {
  const [q, setQ] = useState(initial);
  const [cursor, setCursor] = useState(0);
  const index = useSearchIndex();
  const router = useRouter();
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    try {
      setRecent(JSON.parse(localStorage.getItem("recent-searches") ?? "[]"));
    } catch {}
  }, []);

  const results = useMemo(() => {
    if (!index || q.trim().length < 2) return [];
    return index
      .map((it) => ({ it, s: score(it, q) }))
      .filter((x) => x.s[0] > 0)
      .sort((a, b) => b.s[0] - a.s[0])
      .slice(0, 24);
  }, [index, q]);

  useEffect(() => setCursor(0), [q]);

  const go = (url: string) => {
    try {
      const next = [q.trim(), ...recent.filter((r) => r !== q.trim())].slice(0, 5);
      localStorage.setItem("recent-searches", JSON.stringify(next));
    } catch {}
    onNavigate?.();
    router.push(url);
  };

  return (
    <div>
      <div className="flex gap-2">
        <label className="sr-only" htmlFor="site-search-input">
          Search the site
        </label>
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" width={18} height={18} />
          <input
            id="site-search-input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setCursor((c) => Math.min(results.length - 1, c + 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setCursor((c) => Math.max(0, c - 1));
              } else if (e.key === "Enter" && results[cursor]) {
                e.preventDefault();
                go(results[cursor].it.url);
              }
            }}
            autoFocus={autoFocus}
            autoComplete="off"
            placeholder="Episodes, cast, aberrations, merch…"
            className="field !pl-10 text-lg"
            role="combobox"
            aria-expanded={results.length > 0}
            aria-controls="site-search-results"
            aria-activedescendant={results[cursor] ? `sr-${cursor}` : undefined}
          />
        </div>
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Clear" className="px-3 text-muted hover:text-paper">
            <Close width={18} height={18} />
          </button>
        )}
      </div>

      {q.trim().length < 2 ? (
        <div className="mt-5 text-sm">
          <p className="eyebrow mb-2">Try</p>
          <div className="flex flex-wrap gap-2">
            {[...recent, ...SUGGEST.filter((s) => !recent.includes(s))].slice(0, 8).map((s) => (
              <button key={s} type="button" onClick={() => setQ(s)} className="border border-line px-3 py-1.5 hover:border-yellow hover:text-yellow">
                {s}
              </button>
            ))}
          </div>
        </div>
      ) : !index ? (
        <p className="mt-5 text-sm text-muted">Loading…</p>
      ) : results.length === 0 ? (
        <div className="mt-5 text-sm text-paper/85">
          <p>
            No luck for “{q}”. You can browse the{" "}
            <Link href="/episodes" onClick={onNavigate} className="text-yellow underline underline-offset-4">
              episodes
            </Link>
            ,{" "}
            <Link href="/cast" onClick={onNavigate} className="text-yellow underline underline-offset-4">
              cast
            </Link>
            , and{" "}
            <Link href="/store" onClick={onNavigate} className="text-yellow underline underline-offset-4">
              store
            </Link>{" "}
            instead.
          </p>
        </div>
      ) : (
        <ol id="site-search-results" role="listbox" className="mt-4 divide-y divide-line border-y border-line max-h-[60vh] overflow-y-auto">
          {results.map(({ it, s }, i) => (
            <li key={it.url + it.title} id={`sr-${i}`} role="option" aria-selected={i === cursor}>
              <Link href={it.url} onClick={onNavigate} onMouseEnter={() => setCursor(i)} className={`flex items-center gap-3 px-2 py-2.5 ${i === cursor ? "bg-ink-2" : "hover:bg-ink-2"}`}>
                {it.image ? (
                  <span className="relative size-11 shrink-0 overflow-hidden bg-ink-3">
                    <Image src={it.image} alt="" fill sizes="44px" className="object-cover object-top" />
                  </span>
                ) : (
                  <span className="size-11 shrink-0 grid place-items-center bg-ink-3 text-[10px] font-bold uppercase tracking-wider text-muted">{TYPE_LABEL[it.type].slice(0, 3)}</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="display text-xl truncate">{it.title}</span>
                    <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-yellow shrink-0">{TYPE_LABEL[it.type]}</span>
                  </span>
                  <span className="block text-xs text-muted truncate">
                    {it.subtitle}
                    {s[1] && s[1] !== "title" && s[1] !== "name" ? ` · matched ${s[1]}` : ""}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Site-wide search overlay: opens from the header button, Ctrl/Cmd-K, or the "/" key; Esc closes. */
export function SearchOverlay() {
  const ref = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => {
      const typing = /input|textarea|select/i.test((e.target as HTMLElement)?.tagName ?? "") || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} onClose={() => setOpen(false)} onClick={(e) => e.target === ref.current && setOpen(false)} className="backdrop:bg-black/80 bg-ink-2 text-paper border border-line p-0 mx-auto mt-[8vh] w-[min(94vw,44rem)] shadow-[0_30px_80px_rgba(0,0,0,.8)]" aria-label="Search">
      <div className="p-4 sm:p-6">
        {open && <SearchPanel onNavigate={() => setOpen(false)} />}
        <p className="mt-3 text-[11px] text-muted">
          <kbd className="border border-line px-1">Esc</kbd> to close
        </p>
      </div>
    </dialog>
  );
}

/** Header button that opens the overlay. */
export function SearchButton({ className = "" }: { className?: string }) {
  return (
    <button type="button" onClick={openSearch} aria-label="Search" className={className}>
      <SearchIcon width={22} height={22} />
    </button>
  );
}
