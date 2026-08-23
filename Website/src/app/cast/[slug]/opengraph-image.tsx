import { ImageResponse } from "next/og";
import fs from "node:fs/promises";
import path from "node:path";
import cast from "@/data/cast.json";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "[REDACTED] cast";

export default async function OG({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = cast.find((x) => x.slug === slug);
  const font = await fs.readFile(path.join(process.cwd(), "src/fonts/NK57MonospaceCdEb.otf"));
  const pub = (p: string) => fs.readFile(path.join(process.cwd(), "public", p));
  const portrait = c ? `data:image/png;base64,${(await pub(c.image)).toString("base64")}` : null;
  const logo = `data:image/png;base64,${(await pub("/brand/logo-black.png")).toString("base64")}`;

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#090909", color: "#f2f0ea", fontFamily: "NK57" }}>
        {portrait && <img src={portrait} alt="" style={{ width: 504, height: 630, objectFit: "cover", objectPosition: "top" }} />}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-end", padding: 56, background: "linear-gradient(90deg,#090909,#161212)" }}>
          <div style={{ fontSize: 28, color: "#fff200", letterSpacing: 2, textTransform: "uppercase" }}>{c?.character ?? "[REDACTED]"}</div>
          <div style={{ fontSize: 88, lineHeight: 0.95, textTransform: "uppercase", marginTop: 8 }}>{c?.actor ?? "Cast"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 40 }}>
            <div style={{ width: 160, height: 44, background: "#fff200", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <img src={logo} alt="" style={{ height: 30 }} />
            </div>
            <div style={{ fontSize: 24, color: "#aaa49b", textTransform: "uppercase", letterSpacing: 2 }}>A horror comedy audio drama</div>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "NK57", data: font, style: "normal", weight: 800 }] },
  );
}
