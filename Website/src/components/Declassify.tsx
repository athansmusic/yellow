"use client";

import { useState } from "react";

/**
 * Wraps a dossier. Anything inside with class "classified" renders as a black bar until the reader
 * clicks Declassify (spoilers). The choice is remembered per aberration for the session.
 */
export function Declassify({ id, children }: { id: string; children: React.ReactNode }) {
  const key = `declassified:${id}`;
  const [open, setOpen] = useState<boolean>(() => typeof window !== "undefined" && sessionStorage.getItem(key) === "1");
  const toggle = () => {
    const next = !open;
    setOpen(next);
    try {
      sessionStorage.setItem(key, next ? "1" : "0");
    } catch {}
  };
  return (
    <div className="dossier" data-open={open ? "" : undefined}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-y border-line py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
          {open ? "Declassified. Spoilers showing." : "Portions withheld. Contains spoilers for the episode."}
        </p>
        <button type="button" onClick={toggle} className={`btn !min-h-10 !text-base !px-4 ${open ? "btn-ghost" : "btn-yellow"}`} aria-pressed={open}>
          {open ? "Re-classify" : "Declassify"}
        </button>
      </div>
      {children}
    </div>
  );
}
