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
  const font = await fs.readFile(path.join(process.cwd(), "src/fonts/NK57MonospaceCdEb.otf"));
  const logo = `data:image/png;base64,${(await fs.readFile(path.join(process.cwd(), "public/brand/logo-black.png"))).toString("base64")}`;
  // Episode art is remote (Acast); fetch it so the card always renders the same image
  let art: string | null = null;
  try {
    const src = ep?.image || `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://theredactedunit.com"}/brand/showart.jpeg`;
    const r = await fetch(src);
    if (r.ok) art = `data:${r.headers.get("content-type") ?? "image/jpeg"};base64,${Buffer.from(await r.arrayBuffer()).toString("base64")}`;
  } catch {}

  const kind = ep?.kind === "episode" ? ep.code : ep?.kind === "postmortem" ? "Postmortem" : ep?.kind === "minisode" ? "Minisode" : "Episode";
  const title = ep ? (ep.kind === "episode" ? ep.shortTitle : ep.shortTitle) : "REDACTED";
  const titleSize = title.length > 26 ? 64 : title.length > 16 ? 80 : 96;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#090909", color: "#f2f0ea", fontFamily: "NK57" }}>
        {art && <img src={art} alt="" style={{ width: 630, height: 630, objectFit: "cover" }} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 52, background: "linear-gradient(90deg,#090909,#161212)" }}>
          <div style={{ fontSize: 30, color: "#fff200", letterSpacing: 2, textTransform: "uppercase" }}>{kind}</div>
          <div style={{ fontSize: titleSize, lineHeight: 0.95, textTransform: "uppercase", marginTop: 8 }}>{title}</div>
          {ep && <div style={{ fontSize: 24, color: "#aaa49b", marginTop: 18, textTransform: "uppercase", letterSpacing: 1 }}>{formatDate(ep.date)}</div>}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 40 }}>
            <div style={{ width: 160, height: 44, background: "#fff200", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logo} alt="" style={{ height: 30 }} />
            </div>
            <div style={{ fontSize: 22, color: "#aaa49b", textTransform: "uppercase", letterSpacing: 2 }}>A horror comedy audio drama</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "NK57", data: font, style: "normal", weight: 800 }] },
  );
}
