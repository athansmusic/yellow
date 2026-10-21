"use client";

import { useState } from "react";

/** Copies text to the clipboard with a brief confirmation. */
export function CopyButton({ text, label = "Copy", className = "" }: { text: string; label?: string; className?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        } catch {
          window.prompt("Copy this link", text);
        }
      }}
      className={className}
      aria-live="polite"
    >
      {done ? "Copied" : label}
    </button>
  );
}

const isMobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

/**
 * Opens the native app on phones (Apple Podcasts, Spotify, Overcast, Pocket Casts) and falls back to the web
 * link if the app isn't installed; desktop just follows the web link in a new tab.
 */
export function SmartLink({ href, scheme, className, children, ariaLabel }: { href: string; scheme?: string; className?: string; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={ariaLabel}
      className={className}
      onClick={(e) => {
        if (!scheme || !isMobile()) return;
        e.preventDefault();
        const t = setTimeout(() => window.location.assign(href), 1200);
        window.addEventListener("pagehide", () => clearTimeout(t), { once: true });
        window.location.assign(scheme);
      }}
    >
      {children}
    </a>
  );
}
