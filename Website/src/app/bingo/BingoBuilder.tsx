"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

/**
 * Port of the old Webflow /bingo page: a blank 5x5 card you fill in yourself, themed per show,
 * with the show's art as the free space. Download draws the card to a canvas at 2x (the old page
 * used html2canvas, which chokes on Tailwind v4's oklch colors, so we paint it by hand).
 */
const THEMES = {
  redacted: { bg: "#FFF200", text: "#000000", titleColor: "#A21D2D", title: "[REDACTED] BINGO CARD", img: "/bingo/redacted.png", label: "REDACTED" },
  postmortem: { bg: "#000000", text: "#FFFFFF", titleColor: "#FFFFFF", title: "POSTMORTEM BINGO CARD", img: "/bingo/postmortem.jpg", label: "REDACTED: POSTMORTEM" },
  grotto: { bg: "#013220", text: "#FFFFFF", titleColor: "#FFFFFF", title: "THE GROTTO BINGO CARD", img: "/bingo/grotto.jpg", label: "THE GROTTO" },
  cellar: { bg: "#000000", text: "#90EE90", titleColor: "#90EE90", title: "THE CELLAR LETTERS BINGO CARD", img: "/bingo/cellar.jpg", label: "THE CELLAR LETTERS" },
  planes: { bg: "#5A0000", text: "#FFD700", titleColor: "#FFD700", title: "THE SEVEN PLANES BINGO CARD", img: "/bingo/planes.jpg", label: "THE SEVEN PLANES" },
} as const;
type ThemeKey = keyof typeof THEMES;

/** Shrinks its font until the text fits the square (the old page did the same trick). */
function Cell({ text, color }: { text: string; color: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = 15;
    el.style.fontSize = size + "px";
    while (el.scrollHeight > el.clientHeight && size > 7) {
      size--;
      el.style.fontSize = size + "px";
    }
  }, [text]);
  return (
    <div ref={ref} className="aspect-square flex items-center justify-center overflow-hidden p-1 text-center font-semibold leading-[1.15] [word-break:break-word] border" style={{ color, borderColor: color }}>
      {text}
    </div>
  );
}

function wrapFit(ctx: CanvasRenderingContext2D, text: string, family: string, maxW: number, maxH: number) {
  for (let size = 40; ; size -= 2) {
    ctx.font = `600 ${size}px ${family}`;
    const words = text.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = "";
    for (const w of words) {
      const t = line ? line + " " + w : w;
      if (!line || ctx.measureText(t).width <= maxW) line = t;
      else {
        lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
    const lh = size * 1.15;
    if (size <= 14 || (lines.length * lh <= maxH && lines.every((l) => ctx.measureText(l).width <= maxW))) return { lines, size, lh };
  }
}

export default function BingoBuilder() {
  const [theme, setTheme] = useState<ThemeKey>("redacted");
  const [subtitle, setSubtitle] = useState("");
  const [squares, setSquares] = useState<string[]>(() => Array(24).fill(""));
  const [busy, setBusy] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const t = THEMES[theme];

  const setSquare = (i: number, v: string) => setSquares((s) => s.map((x, j) => (j === i ? v : x)));

  const download = useCallback(async () => {
    setBusy(true);
    try {
      const family = cardRef.current ? getComputedStyle(cardRef.current).fontFamily : "Arial, sans-serif";
      const img = new Image();
      img.src = t.img;
      await img.decode().catch(() => {});

      const W = 1500;
      const pad = 70;
      const grid = W - pad * 2;
      const cell = grid / 5;
      const titleSize = 76;
      const subSize = 40;
      const headH = pad + titleSize * 1.2 + (subtitle.trim() ? subSize * 1.5 : 0) + 40;
      const H = Math.round(headH + grid + pad);

      const canvas = document.createElement("canvas");
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = t.bg;
      ctx.fillRect(0, 0, W, H);

      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = t.titleColor;
      ctx.font = `800 ${titleSize}px ${family}`;
      ctx.fillText(t.title, W / 2, pad + titleSize, W - pad * 2);
      if (subtitle.trim()) {
        ctx.fillStyle = t.text;
        ctx.font = `600 ${subSize}px ${family}`;
        ctx.fillText(subtitle.trim(), W / 2, pad + titleSize + subSize * 1.5, W - pad * 2);
      }

      const gy = headH;
      let k = 0;
      ctx.textBaseline = "middle";
      for (let i = 0; i < 25; i++) {
        const cx = pad + (i % 5) * cell;
        const cy = gy + Math.floor(i / 5) * cell;
        if (i === 12) {
          // free space: the show art, contain-fit
          const r = Math.min((cell - 16) / img.width, (cell - 16) / img.height) || 0;
          if (r > 0) ctx.drawImage(img, cx + (cell - img.width * r) / 2, cy + (cell - img.height * r) / 2, img.width * r, img.height * r);
        } else {
          const text = squares[k++];
          if (text.trim()) {
            ctx.fillStyle = t.text;
            const { lines, size, lh } = wrapFit(ctx, text.trim(), family, cell - 24, cell - 20);
            ctx.font = `600 ${size}px ${family}`;
            const y0 = cy + cell / 2 - ((lines.length - 1) * lh) / 2;
            lines.forEach((l, n) => ctx.fillText(l, cx + cell / 2, y0 + n * lh));
          }
        }
        ctx.strokeStyle = t.text;
        ctx.lineWidth = 4;
        ctx.strokeRect(cx, cy, cell, cell);
      }
      ctx.lineWidth = 8;
      ctx.strokeRect(pad, gy, grid, grid);

      const a = document.createElement("a");
      a.download = "bingo-card.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    } finally {
      setBusy(false);
    }
  }, [t, subtitle, squares]);

  return (
    <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      {/* The card */}
      <div ref={cardRef} className="p-4 sm:p-6 lg:sticky lg:top-24" style={{ background: t.bg, color: t.text }}>
        <p className="text-center text-xl sm:text-2xl font-extrabold tracking-wide" style={{ color: t.titleColor }}>
          {t.title}
        </p>
        {subtitle.trim() && <p className="text-center text-sm font-semibold mt-1">{subtitle.trim()}</p>}
        <div className="mt-3 grid grid-cols-5 border-[3px]" style={{ borderColor: t.text }}>
          {Array.from({ length: 25 }, (_, i) =>
            i === 12 ? (
              <div key={i} className="aspect-square border p-1" style={{ borderColor: t.text }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={t.img} alt="" className="w-full h-full object-contain" />
              </div>
            ) : (
              <Cell key={i} text={squares[i > 12 ? i - 1 : i]} color={t.text} />
            ),
          )}
        </div>
      </div>

      {/* The controls */}
      <div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="eyebrow">Show</span>
            <select value={theme} onChange={(e) => setTheme(e.target.value as ThemeKey)} className="mt-1 w-full border border-line bg-ink-2 p-3 text-paper">
              {(Object.keys(THEMES) as ThemeKey[]).map((k) => (
                <option key={k} value={k}>
                  {THEMES[k].label}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="eyebrow">Card subtitle</span>
            <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Finale watch party" className="mt-1 w-full border border-line bg-ink-2 p-3 text-paper placeholder:text-muted" />
          </label>
        </div>

        <p className="eyebrow mt-6">Squares</p>
        <p className="text-sm text-muted mt-1">24 spaces, the center is free. Type a prediction into each one and watch the card fill in.</p>
        <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
          {squares.map((v, i) => (
            <input key={i} value={v} onChange={(e) => setSquare(i, e.target.value)} placeholder={`Space ${i + 1}`} className="border border-line bg-ink-2 p-2.5 text-sm text-paper placeholder:text-muted" />
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button type="button" onClick={download} disabled={busy} className="btn btn-yellow disabled:opacity-60">
            {busy ? "Rendering…" : "Download PNG"}
          </button>
          <button type="button" onClick={() => setSquares(Array(24).fill(""))} className="text-sm text-muted underline underline-offset-4 hover:text-yellow">
            Clear the card
          </button>
        </div>
      </div>
    </div>
  );
}
