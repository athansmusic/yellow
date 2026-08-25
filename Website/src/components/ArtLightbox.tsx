"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Close } from "./Icons";

type Piece = { id: string; url: string; title: string };

/** Art grid where any piece opens full screen; arrows walk the set, Escape closes. */
export function ArtLightbox({ pieces, artist }: { pieces: Piece[]; artist: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(null), []);
  const step = useCallback(
    (d: number) => setOpen((i) => (i === null ? null : (i + d + pieces.length) % pieces.length)),
    [pieces.length],
  );

  useEffect(() => {
    if (open === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") step(1);
      else if (e.key === "ArrowLeft") step(-1);
      else if (e.key === "Tab") e.preventDefault(); // nothing outside the viewer is reachable
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
      openerRef.current?.focus();
    };
  }, [open, close, step]);

  const current = open === null ? null : pieces[open];

  return (
    <>
      <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pieces.map((a, i) => (
          <li key={a.id}>
            <button
              type="button"
              onClick={(e) => {
                openerRef.current = e.currentTarget;
                setOpen(i);
              }}
              className="group block w-full border border-line bg-ink-2/70 text-left hover:border-yellow"
              aria-label={`View ${a.title || `art by ${artist}`} full screen`}
            >
              <span className="relative block aspect-square bg-ink overflow-hidden">
                <Image src={a.url} alt={a.title || `Art by ${artist}`} fill sizes="(min-width:640px) 20vw, 45vw" className="object-contain transition-transform group-hover:scale-[1.03]" />
              </span>
              {a.title && <span className="block p-2 text-xs text-paper/85 truncate">{a.title}</span>}
            </button>
          </li>
        ))}
      </ul>

      {current && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={current.title || `Art by ${artist}`}
          className="fixed inset-0 z-50 bg-black/95 flex flex-col outline-none"
          onClick={(e) => e.target === e.currentTarget && close()}
        >
          <div className="flex items-center justify-between gap-4 p-4 shrink-0">
            <p className="display text-xl truncate">
              {current.title || `Art by ${artist}`}
              {pieces.length > 1 && (
                <span className="ml-3 text-xs text-muted tabular">
                  {(open ?? 0) + 1} / {pieces.length}
                </span>
              )}
            </p>
            <button type="button" onClick={close} aria-label="Close" className="p-2 -m-2 text-muted hover:text-yellow shrink-0">
              <Close width={24} height={24} />
            </button>
          </div>

          <div className="relative flex-1 min-h-0 flex items-center justify-center px-4 pb-4" onClick={(e) => e.target === e.currentTarget && close()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={current.url} alt={current.title || `Art by ${artist}`} className="max-h-full max-w-full object-contain" />
          </div>

          {pieces.length > 1 && (
            <>
              <button type="button" onClick={() => step(-1)} aria-label="Previous piece" className="absolute left-2 top-1/2 -translate-y-1/2 size-12 grid place-items-center text-3xl text-paper/70 hover:text-yellow">
                ‹
              </button>
              <button type="button" onClick={() => step(1)} aria-label="Next piece" className="absolute right-2 top-1/2 -translate-y-1/2 size-12 grid place-items-center text-3xl text-paper/70 hover:text-yellow">
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
