import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import { getItemBySlug } from "@/lib/feed";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "REDACTED episode";

/** Owner-approved card design (Claude Design, 2026-08-24): dark smoke bg, framed show art left,
 *  show-coded chip, huge Anton title, NK57 letterspaced details. */

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const fmtDate = (iso: string) => {
  const d = new Date(iso);
  return `${String(d.getUTCDate()).padStart(2, "0")} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

/** Balance a long title onto two lines; short ones stay on one. */
function titleLines(t: string): string[] {
  const up = t.toUpperCase();
  if (up.length <= 13) return [up];
  const words = up.split(/\s+/);
  if (words.length === 1) return [up];
  let best = [up, ""];
  let bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(" ");
    const b = words.slice(i).join(" ");
    const diff = Math.abs(a.length - b.length);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = [a, b];
    }
  }
  return best.filter(Boolean);
}

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = await getItemBySlug(slug).catch(() => undefined);
  const [anton, nk57, bgBuf] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "src/fonts/Anton.ttf")),
    fs.readFile(path.join(process.cwd(), "src/fonts/NK57MonospaceCdEb.otf")),
    fs.readFile(path.join(process.cwd(), "public/brand/og-bg.jpg")),
  ]);
  const bg = `data:image/jpeg;base64,${bgBuf.toString("base64")}`;
  // Episode art is remote (Acast); fetch it so the card always renders the same image
  let art: string | null = null;
  try {
    const src = ep?.image || `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theredactedunit.com"}/brand/showart.jpeg`;
    const r = await fetch(src);
    if (r.ok) art = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {}

  // "(Part 2)" leaves the title and becomes the letterspaced line under it
  const raw = ep ? ep.shortTitle : "REDACTED";
  const partMatch = raw.match(/\s*\((part\s*\d+)\)\s*$/i);
  const title = (partMatch ? raw.slice(0, partMatch.index) : raw).trim();
  const part = partMatch ? partMatch[1].toUpperCase() : null;

  const t7p = !!ep && ep.guid.startsWith("t7p-");
  // Show-coded chip: REDACTED yellow, Postmortem red, Seven Planes gold-on-oxblood
  const chip = t7p
    ? { bg: "#5A0000", fg: "#FFD700", label: "T7P" }
    : ep?.kind === "postmortem"
      ? { bg: "#d6d2ca", fg: "#0a0a0a", label: "POSTMORTEM" }
      : ep?.kind === "minisode"
        ? { bg: "#fff200", fg: "#0a0a0a", label: "MINISODE" }
        : { bg: "#fff200", fg: "#0a0a0a", label: ep?.code ?? "EPISODE" };
  const accent = t7p ? "#FFD700" : ep?.kind === "postmortem" ? "#a21d2d" : "#fff200";
  const dateColor = ep?.kind === "episode" ? "#fff200" : "#aaa49b";

  const lines = titleLines(title);
  const longest = Math.max(...lines.map((l) => l.length));
  // Anton runs ~0.52em per uppercase char; text column is ~730px
  // Single-liners stretch toward the full column; two-liners stay slightly smaller
  const ceiling = lines.length === 1 ? 190 : 148;
  const fontSize = Math.max(54, Math.min(ceiling, Math.floor(715 / (longest * 0.52))));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#0a0a0a", fontFamily: "NK57" }}>
        <img src={bg} alt="" style={{ position: "absolute", inset: 0, width: 1200, height: 630 }} />
        {/* chip */}
        <div style={{ position: "absolute", top: 48, left: 52, display: "flex", background: chip.bg, color: chip.fg, fontSize: 24, fontWeight: 800, letterSpacing: 2, padding: "8px 16px 10px" }}>{chip.label}</div>
        {/* date */}
        {ep && <div style={{ position: "absolute", top: 54, right: 52, display: "flex", color: dateColor, fontSize: 20, letterSpacing: 9 }}>{fmtDate(ep.date)}</div>}
        {/* framed show art */}
        {art && (
          <div style={{ position: "absolute", top: 158, left: 52, display: "flex", border: "4px solid #000", boxShadow: "0 10px 40px rgba(0,0,0,.65)" }}>
            <img src={art} alt="" style={{ width: 306, height: 306, objectFit: "cover" }} />
          </div>
        )}
        {/* title block */}
        <div style={{ position: "absolute", left: 418, right: 48, top: 0, height: 630, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          {lines.map((l, i) => (
            <div key={i} style={{ display: "flex", fontFamily: "Anton", fontSize, lineHeight: 1.02, color: "#ffffff" }}>
              {l}
            </div>
          ))}
          {part && <div style={{ display: "flex", marginTop: 14, color: accent, fontSize: 26, letterSpacing: 12 }}>{`( ${part} )`}</div>}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Anton", data: anton, style: "normal", weight: 400 },
        { name: "NK57", data: nk57, style: "normal", weight: 800 },
      ],
    },
  );
}
