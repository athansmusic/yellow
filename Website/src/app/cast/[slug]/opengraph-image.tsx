import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import cast from "@/data/cast.json";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "REDACTED cast";

/** Cast card per the owner's comp (Claude Design, 2026-08-24): portrait left, yellow divider,
 *  dark panel with inset frame, character in yellow, actor huge in white, wordmark bottom-right. */
export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = cast.find((x) => x.slug === slug);
  const pub = (p: string) => fs.readFile(path.join(process.cwd(), "public", p));
  const [bold, xbold, portraitBuf, markBuf] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "src/fonts/Montserrat-Bold.ttf")),
    fs.readFile(path.join(process.cwd(), "src/fonts/Montserrat-ExtraBold.ttf")),
    c ? pub(c.image).catch(() => null) : Promise.resolve(null),
    pub("/brand/logo-nav-hd.png"),
  ]);
  const portrait = portraitBuf ? `data:image/png;base64,${portraitBuf.toString("base64")}` : null;
  const mark = `data:image/png;base64,${markBuf.toString("base64")}`;

  const ink = "#0d0b0c";
  const yellow = "#fbee01";
  const actor = (c?.actor ?? "REDACTED").toUpperCase();
  const nameSize = Math.max(48, Math.min(120, Math.floor(560 / (actor.length * 0.62))));

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: ink, fontFamily: "Montserrat" }}>
        {/* portrait */}
        <div style={{ width: 415, height: 630, display: "flex", overflow: "hidden", background: "#1a1817" }}>
          {portrait && <img src={portrait} alt="" style={{ width: 415, height: 630, objectFit: "cover", objectPosition: "top" }} />}
        </div>
        {/* divider */}
        <div style={{ width: 10, height: 630, background: yellow, display: "flex" }} />
        {/* panel */}
        <div style={{ flex: 1, display: "flex", position: "relative" }}>
          <div style={{ position: "absolute", top: 22, left: 24, right: 24, bottom: 22, border: "1px solid #55524e", display: "flex" }} />
          <div style={{ position: "absolute", left: 62, top: 0, height: 630, right: 56, display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", color: yellow, fontSize: 30, fontWeight: 700, letterSpacing: 10 }}>{(c?.character ?? "CLASSIFIED").toUpperCase()}</div>
            <div style={{ display: "flex", color: "#ffffff", fontSize: nameSize, fontWeight: 800, letterSpacing: 2, marginTop: 10, lineHeight: 1.05 }}>{actor}</div>
            <div style={{ display: "flex", width: 74, height: 8, background: yellow, marginTop: 26 }} />
          </div>
          <img src={mark} alt="" style={{ position: "absolute", right: 52, bottom: 48, height: 40, width: 146, objectFit: "contain" }} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Montserrat", data: bold, style: "normal", weight: 700 },
        { name: "Montserrat", data: xbold, style: "normal", weight: 800 },
      ],
    },
  );
}
