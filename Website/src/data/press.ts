/** Shared press copy: the Partner press kit and the Assets page both read from here so they never diverge. */
import { SITE } from "@/lib/site";
import type { Settings } from "@/lib/content";

export const LOGLINE = "Failed actor Jacob Kane assumes his dead twin's identity and job. The job turns out to be The REDACTED Unit, a covert agency tasked with containing impossible creatures and phenomena.";

type Season = Pick<Settings, "seasonStatus" | "nextSeasonLabel" | "nextSeasonDate"> | null | undefined;

/** Where the show is right now, in a few words. Read from the admin's season setting so every
 * press and partner surface says the same true thing instead of a schedule that has lapsed. */
export function seasonState(s: Season): string {
  const next = s?.nextSeasonLabel || "Season 2";
  if (s?.seasonStatus === "break") {
    const d = s.nextSeasonDate ? new Date(s.nextSeasonDate) : null;
    const when = d && !Number.isNaN(d.getTime()) ? `returns ${d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" })}` : "date TBD";
    return `Between seasons: ${next} confirmed, ${when}`;
  }
  if (s?.seasonStatus === "finished") return "Complete series";
  return `New episodes ${SITE.schedule}`;
}

export function boilerplate(s: Season): string {
  const when = s?.seasonStatus === "break" ? `${seasonState(s)}.` : s?.seasonStatus === "finished" ? "The complete series is available now." : "New episodes Fridays, Postmortem debriefs Tuesdays.";
  return `REDACTED is a horror comedy audio drama from Hush Studios on the Rusty Quill network, created by Athan (The Grotto) and Jamie Petronis (The Cellar Letters). Each episode is a self-contained paranormal case handled by an underfunded secret agency, with the mystery of Jacob Kane's dead twin running underneath. ${when} At theredactedunit.com and on every podcast app.`;
}

export const FACTS: [string, string][] = [
  ["Title", "REDACTED"],
  ["Format", "Scripted horror comedy audio drama, monster-of-the-week with a serialized mystery"],
  ["Created by", "Athan (Johnathan Magno) and Jamie Petronis"],
  ["Studio", "Hush Studios"],
  ["Network", "Rusty Quill"],
  ["Premiered", "November 8, 2025"],
  ["Schedule", "New episodes Fridays, 9 pm ET / 8 pm CT; Postmortem Tuesdays"], // swapped for seasonState() by factsFor()
  ["Episode length", "About 30 minutes"],
  ["Lead cast", "Jamie Petronis (Jacob Kane), Athan (Eli Reyes), Ishani Kanetkar (Hedy Hauksdottir), Kirsten Ria (Jo Valentine), Devin Steffens (Lucas Kipp), Joe Cliff Thompson (Maxwell Clark)"],
  ["Spin-offs", "Postmortem (in-universe debriefs), The Seven Planes (analog horror, Landon Whisnant)"],
  ["Funding", "Kickstarter, 313% funded, 400+ backers"],
  ["Show art", "7cfc00"],
  ["Contact", SITE.email],
];

/** The fact sheet with its Schedule row following the season state. */
export const factsFor = (s: Season): [string, string][] => FACTS.map(([k, v]) => (k === "Schedule" ? [k, seasonState(s)] : [k, v]));

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

/** Reviews and blurbs, shared by the partner page and the press page. */
export const QUOTES = [
  { q: "REDACTED is the inheritor to all your favourite spooky procedurals. Fun and sinister in equal measure, with a central mystery that grabs you by the brain and won't let go.", who: "Jonathan Sims", role: "The Magnus Archives" },
  { q: "If you've wanted to take your monster of the week with you on the go, look no further!", who: "John Squires", role: "Bloody Disgusting" },
  { q: "REDACTED wastes no time building stakes, and laying the groundwork for a solid mystery.", who: "Elyse Willems", role: "Funhaus" },
  { q: "Whatever you are expecting, REDACTED blows those expectations out the water. With incredible performances by the cast supported by high grade sound design and intelligent scripting, REDACTED perfectly represents the genre that is horror comedy.", who: "Tatiana Gefter", role: "Soul Operator" },
];
