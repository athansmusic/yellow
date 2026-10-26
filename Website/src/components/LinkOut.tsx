"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * A link somebody else put on the page, with a look before you leap.
 *
 * Used for member-written links in comments, and deliberately not for the site's own outbound
 * links — a warning on the Spotify button would be friction protecting nobody. The risk here is
 * specific: this URL was typed by another listener, and the reader has no reason to trust it.
 *
 * The dialog leads with the HOST rather than the whole URL, because the host is the part that
 * answers "where am I actually going" — a long path is where a misleading link hides its
 * destination.
 *
 * Modified clicks (new tab, middle click, download) are left alone: someone deliberately opening
 * in a background tab has already decided, and hijacking that would be worse than the warning is
 * good. The href stays real throughout, so hovering shows the true destination and the link works
 * with JavaScript disabled.
 */
export function LinkOut({ href, children }: { href: string; children: React.ReactNode }) {
  const [asking, setAsking] = useState(false);

  let host = "";
  try {
    host = new URL(href).host;
  } catch {
    host = href;
  }

  const onClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let the browser handle anything that is not a plain left click.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    setAsking(true);
  }, []);

  useEffect(() => {
    if (!asking) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAsking(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [asking]);

  return (
    <>
      <a
        href={href}
        onClick={onClick}
        target="_blank"
        rel="noopener noreferrer nofollow ugc"
        className="text-yellow underline underline-offset-4 [overflow-wrap:anywhere]"
      >
        {children}
      </a>

      {asking && (
        <span
          role="dialog"
          aria-modal="true"
          aria-label="Leaving the site"
          className="fixed inset-0 z-[100] grid place-items-center p-4"
        >
          <button
            type="button"
            aria-label="Cancel"
            onClick={() => setAsking(false)}
            className="absolute inset-0 bg-black/80"
          />
          <span className="relative block w-full max-w-md border border-line bg-ink-2 p-6 shadow-[0_20px_60px_rgba(0,0,0,.7)]">
            <span className="eyebrow block text-yellow">Leaving REDACTED</span>
            <span className="display mt-2 block text-2xl leading-tight [overflow-wrap:anywhere]">{host}</span>
            <span className="mt-3 block text-sm text-muted [overflow-wrap:anywhere]">{href}</span>
            <span className="mt-4 block text-sm text-paper/80">
              Another listener posted this link. We have not checked where it goes.
            </span>
            <span className="mt-5 flex flex-wrap gap-3">
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer nofollow ugc"
                onClick={() => setAsking(false)}
                className="display text-lg px-4 py-2 bg-yellow text-ink border border-yellow hover:bg-transparent hover:text-yellow transition-colors"
              >
                Continue
              </a>
              <button
                type="button"
                autoFocus
                onClick={() => setAsking(false)}
                className="display text-lg px-4 py-2 border border-line text-paper hover:border-yellow hover:text-yellow transition-colors"
              >
                Stay here
              </button>
            </span>
          </span>
        </span>
      )}
    </>
  );
}
