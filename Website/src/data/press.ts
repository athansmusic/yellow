/** Shared press copy: the Partner press kit and the Assets page both read from here so they never diverge. */
import { SITE } from "@/lib/site";

export const LOGLINE = "Failed actor Jacob Kane assumes his dead twin's identity and job. The job turns out to be The REDACTED Unit, a covert agency tasked with containing impossible creatures and phenomena.";

export const BOILERPLATE =
  "REDACTED is a horror comedy audio drama from Hush Studios on the Rusty Quill network, created by Athan (The Grotto) and Jamie Petronis (The Cellar Letters). Each episode is a self-contained paranormal case handled by an underfunded secret agency, with the mystery of Jacob Kane's dead twin running underneath. New episodes Fridays, Postmortem debriefs Tuesdays, at theredactedunit.com and on every podcast app.";

export const FACTS: [string, string][] = [
  ["Title", "REDACTED (also written [REDACTED])"],
  ["Format", "Scripted horror comedy audio drama, monster-of-the-week with a serialized mystery"],
  ["Created by", "Athan (Johnathan Magno) and Jamie Petronis"],
  ["Studio", "Hush Studios"],
  ["Network", "Rusty Quill"],
  ["Premiered", "November 8, 2025"],
  ["Schedule", "New episodes Fridays, 9 pm ET / 8 pm CT; Postmortem Tuesdays"],
  ["Episode length", "About 30 minutes"],
  ["Lead cast", "Jamie Petronis (Jacob Kane), Athan (Eli Reyes), Ishani Kanetkar (Hedy Hauksdottir), Kirsten Ria (Jo Valentine), Devin Steffens (Lucas Kipp), Joe Cliff Thompson (Maxwell Clark)"],
  ["Spin-offs", "Postmortem (in-universe debriefs), The Seven Planes (analog horror, Landon Whisnant)"],
  ["Funding", "Kickstarter, 313% funded, 400+ backers"],
  ["Show art", "7cfc00"],
  ["Contact", SITE.email],
];

export const PALETTE: { name: string; token: string; hex: string; use: string }[] = [
  { name: "Yellow", token: "yellow", hex: "#FFF200", use: "Accent, buttons, the figure mark" },
  { name: "Red", token: "red", hex: "#A21D2D", use: "Warnings, Postmortem, the mark's shadow" },
  { name: "Ink", token: "ink", hex: "#090909", use: "Page background" },
  { name: "Ink 2", token: "ink-2", hex: "#161212", use: "Cards and panels" },
  { name: "Paper", token: "paper", hex: "#F2F0EA", use: "Text on dark" },
];

export const hexToRgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

export type PressFile = { file: string; name: string; note: string; preview?: boolean; dark?: boolean; wide?: boolean };

/** Files live in public/press (built by scripts/build-press.mjs). Sizes are read from disk by the page. */
export const PRESS_GROUPS: { title: string; blurb: string; files: PressFile[] }[] = [
  {
    title: "Logo pack",
    blurb: "The figure mark and the wordmark. Vector where it exists, PNG at 2000px otherwise.",
    files: [
      { file: "REDACTED-mark-yellow.svg", name: "Mark, yellow", note: "SVG", preview: true },
      { file: "REDACTED-mark-white.svg", name: "Mark, white", note: "SVG", preview: true },
      { file: "REDACTED-mark-black.svg", name: "Mark, black", note: "SVG", preview: true, dark: false },
      { file: "REDACTED-mark-yellow.png", name: "Mark, yellow", note: "PNG, 2000px" },
      { file: "REDACTED-mark-white.png", name: "Mark, white", note: "PNG, 2000px" },
      { file: "REDACTED-mark-black.png", name: "Mark, black", note: "PNG, 2000px" },
      { file: "REDACTED-wordmark-white.png", name: "Wordmark, white", note: "PNG, transparent", preview: true },
      { file: "REDACTED-wordmark-outline.png", name: "Wordmark, outline", note: "PNG, transparent", preview: true },
      { file: "REDACTED-wordmark-black.png", name: "Wordmark, black", note: "PNG, transparent", preview: true, dark: false },
    ],
  },
  {
    title: "Art",
    blurb: "Show art by 7cfc00 and the key art used across the site.",
    files: [
      { file: "REDACTED-show-art.jpg", name: "Show art", note: "JPEG, 3000×3000", preview: true },
      { file: "REDACTED-key-art.jpg", name: "Key art", note: "JPEG, wide", preview: true, wide: true },
    ],
  },
  {
    title: "Laurels",
    blurb: "Festival laurels, individually and as one transparent strip.",
    files: [{ file: "REDACTED-laurels-strip.png", name: "All laurels", note: "PNG strip, transparent, 4800×1200", preview: true, wide: true }],
  },
];

export const PRESS_ZIP = "REDACTED-press-kit.zip";
