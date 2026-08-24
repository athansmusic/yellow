import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import { getItemBySlug, getAllItems } from "@/lib/feed";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "REDACTED episode";

/** Owner's card design v2 (Claude Design, 2026-08-24): pure typographic logo cards.
 *  The template jpgs carry the texture, frame, show logo, and CTA straight from the comps;
 *  this file draws only the season/episode line and the title bar on top. */

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = await getItemBySlug(slug).catch(() => undefined);
  const pm = ep?.kind === "postmortem";
  const [anton, nk57, tplBuf] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "src/fonts/Anton.ttf")),
    fs.readFile(path.join(process.cwd(), "src/fonts/NK57MonospaceCdEb.otf")),
    fs.readFile(path.join(process.cwd(), pm ? "public/brand/og-tpl-postmortem.jpg" : "public/brand/og-tpl-redacted.jpg")),
  ]);
  const tpl = `data:image/jpeg;base64,${tplBuf.toString("base64")}`;

  // "(Part 2)" leaves the title and joins the top label
  const raw = ep ? ep.shortTitle : "REDACTED";
  const partMatch = raw.match(/\s*\((part\s*(\d+))\)\s*$/i);
  const title = (partMatch ? raw.slice(0, partMatch.index) : raw).trim().toUpperCase();

  // Postmortems have no feed code; their number is their position in the PM run
  let num: number | undefined = ep?.number ?? undefined;
  if (pm && ep) {
    const pms = (await getAllItems().catch(() => []))
      .filter((e) => e.kind === "postmortem")
      .sort((a, b) => +new Date(a.date) - +new Date(b.date));
    const i = pms.findIndex((e) => e.slug === ep.slug);
    if (i >= 0) num = i + 1;
  }
  const label = [
    `SEASON ${ep?.season ?? 1}`,
    ep?.kind === "minisode" ? "MINISODE" : num ? `EPISODE ${num}` : "SPECIAL",
    ...(partMatch ? [`PART ${partMatch[2]}`] : []),
  ].join("   /   ");

  // Colors sampled from the comps
  const ink = "#0d0b0a";
  const yellow = "#fbee01";
  const labelColor = pm ? "#8b898a" : ink;
  const barBg = pm ? "#f4f2ef" : ink;
  const barFg = pm ? ink : yellow;

  // Anton sizing for the title bar (single line, bar hugs the text)
  const fontSize = Math.max(34, Math.min(64, Math.floor(560 / (title.length * 0.52))));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: pm ? "#090708" : yellow, fontFamily: "NK57" }}>
        <img src={tpl} alt="" style={{ position: "absolute", inset: 0, width: 1200, height: 630 }} />
        {/* season / episode line with flanking rules */}
        <div style={{ position: "absolute", top: 48, left: 60, right: 60, display: "flex", alignItems: "center", gap: 26 }}>
          <div style={{ flex: 1, height: 2, background: labelColor, display: "flex" }} />
          <div style={{ display: "flex", color: labelColor, fontSize: 19, fontWeight: 800, letterSpacing: 8, whiteSpace: "pre" }}>{label}</div>
          <div style={{ flex: 1, height: 2, background: labelColor, display: "flex" }} />
        </div>
        {/* title bar */}
        <div style={{ position: "absolute", top: 372, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "flex", background: barBg, color: barFg, fontFamily: "Anton", fontSize, lineHeight: 1, padding: "18px 44px 22px", letterSpacing: 1 }}>{title}</div>
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
