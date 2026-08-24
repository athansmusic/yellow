import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import { getItemBySlug, formatDate } from "@/lib/feed";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "REDACTED episode";

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ep = await getItemBySlug(slug).catch(() => undefined);
  const [bold, xbold, wordmark] = await Promise.all([
    fs.readFile(path.join(process.cwd(), "src/fonts/Montserrat-Bold.ttf")),
    fs.readFile(path.join(process.cwd(), "src/fonts/Montserrat-ExtraBold.ttf")),
    fs.readFile(path.join(process.cwd(), "public/brand/wordmark-black.png")),
  ]);
  const mark = `data:image/png;base64,${wordmark.toString("base64")}`;
  // Episode art is remote (Acast); fetch it so the card always renders the same image
  let art: string | null = null;
  try {
    const src = ep?.image || `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theredactedunit.com"}/brand/showart.jpeg`;
    const r = await fetch(src);
    if (r.ok) art = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {}

  const kind = ep?.kind === "episode" ? ep.code : ep?.kind === "postmortem" ? "Postmortem" : ep?.kind === "minisode" ? "Minisode" : "Episode";
  const title = ep ? ep.shortTitle : "REDACTED";
  const titleSize = title.length > 26 ? 54 : title.length > 16 ? 66 : 80;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#0a0a0a", color: "#f2f0ea", fontFamily: "Montserrat" }}>
        {art && <img src={art} alt="" style={{ width: 630, height: 630, objectFit: "cover" }} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 56, background: "linear-gradient(135deg,#0a0a0a 30%,#181414)" }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: "#fff200", letterSpacing: 5, textTransform: "uppercase" }}>{kind}</div>
          <div style={{ fontSize: titleSize, fontWeight: 800, lineHeight: 1.06, textTransform: "uppercase", marginTop: 12 }}>{title}</div>
          {ep && <div style={{ fontSize: 21, fontWeight: 700, color: "#aaa49b", marginTop: 20, textTransform: "uppercase", letterSpacing: 2 }}>{formatDate(ep.date)}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 44 }}>
            <div style={{ display: "flex", alignItems: "center", background: "#fff200", padding: "12px 18px" }}>
              <img src={mark} alt="" style={{ height: 24 }} />
            </div>
            <div style={{ fontSize: 19, fontWeight: 700, color: "#aaa49b", textTransform: "uppercase", letterSpacing: 2, lineHeight: 1.35, maxWidth: 320 }}>A horror comedy audio drama</div>
          </div>
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
