"use client";

import Link from "next/link";
import { useState } from "react";
import { TAXONOMY, type Category } from "@/lib/storeTaxonomy";

const isTouch = () => typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
const isPhone = () => typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches;

type Counts = Record<string, number>; // keys: "all", category id, `${category}/${sub}`

/**
 * Category bar with hover/focus subcategory panels (and tap on touch).
 * Server passes counts so empty subcategories are hidden.
 */
export function StoreNav({ counts, active }: { counts: Counts; active: { category?: Category; sub?: string } }) {
  const [open, setOpen] = useState<Category | null>(null);

  return (
    <nav aria-label="Store categories" className="relative border-b border-line" onMouseLeave={() => setOpen(null)}>
      <ul className="flex flex-nowrap sm:flex-wrap gap-1 -mx-4 px-4 sm:-mx-1 sm:px-1 overflow-x-auto sm:overflow-visible [scrollbar-width:none]">
        <li>
          <Link href="/store" aria-current={!active.category ? "page" : undefined} className={`display text-xl sm:text-2xl px-4 py-3 block whitespace-nowrap [text-wrap:nowrap] border-b-4 ${!active.category ? "border-yellow text-yellow" : "border-transparent hover:text-yellow"}`}>
            All <span className="text-muted text-base tabular">({counts.all ?? 0})</span>
          </Link>
        </li>
        {TAXONOMY.map((cat) => {
          const isActive = active.category === cat.id;
          const subs = cat.subs.filter((s) => (counts[`${cat.id}/${s.id}`] ?? 0) > 0);
          const isOpen = open === cat.id;
          return (
            <li key={cat.id} className="relative" onMouseEnter={() => setOpen(cat.id)} onFocus={() => !isTouch() && setOpen(cat.id)}>
              <Link
                href={`/store?c=${cat.id}`}
                aria-current={isActive && !active.sub ? "page" : undefined}
                aria-haspopup={subs.length > 0 ? "true" : undefined}
                aria-expanded={subs.length > 0 ? isOpen : undefined}
                onClick={(e) => {
                  // Touch: first tap opens the panel, second tap follows the link. Phones skip the panel (the tab strip scrolls and would clip it) and go straight to the category page, which lists subcategories.
                  if (subs.length && isTouch() && !isPhone() && !isOpen) {
                    e.preventDefault();
                    setOpen(cat.id);
                  }
                }}
                className={`display text-xl sm:text-2xl px-4 py-3 block whitespace-nowrap [text-wrap:nowrap] border-b-4 ${isActive ? "border-yellow text-yellow" : "border-transparent hover:text-yellow"}`}
              >
                {cat.label} <span className="text-muted text-base tabular">({counts[cat.id] ?? 0})</span>
              </Link>
              {subs.length > 0 && (
                <ul className={`absolute left-0 top-full z-20 min-w-56 bg-ink-2 border border-line shadow-[0_20px_40px_rgba(0,0,0,.6)] py-2 ${isOpen ? "block" : "hidden"}`} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget as Node) && setOpen(null)}>
                  <li>
                    <Link href={`/store?c=${cat.id}`} className="flex justify-between gap-6 px-4 py-2 text-sm hover:bg-ink-3 hover:text-yellow">
                      All {cat.label} <span className="text-muted tabular">{counts[cat.id] ?? 0}</span>
                    </Link>
                  </li>
                  {subs.map((s) => {
                    const on = isActive && active.sub === s.id;
                    return (
                      <li key={s.id}>
                        <Link href={`/store?c=${cat.id}&t=${s.id}`} aria-current={on ? "page" : undefined} className={`flex justify-between gap-6 px-4 py-2 text-sm hover:bg-ink-3 hover:text-yellow ${on ? "text-yellow" : ""}`}>
                          {s.label} <span className="text-muted tabular">{counts[`${cat.id}/${s.id}`]}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
