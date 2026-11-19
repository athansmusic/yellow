"use client";

import { useState } from "react";

/** Native share sheet where available (phones), copy-link everywhere else. */
export function ShareButton({ title, text, path, className = "" }: { title: string; text?: string; path: string; className?: string }) {
  const [done, setDone] = useState(false);
  const url = typeof window === "undefined" ? path : `${window.location.origin}${path}`;

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setDone(true);
      setTimeout(() => setDone(false), 2000);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <button type="button" onClick={share} className={`inline-flex items-center gap-2 min-h-10 px-3 border border-line text-sm font-semibold hover:border-yellow hover:text-yellow ${className}`} aria-live="polite">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M16 6l-4-4-4 4M12 2v13" />
      </svg>
      {done ? "Link copied" : "Share"}
    </button>
  );
}
