// Builds the press/brand pack in public/press from the source art. Run: node scripts/build-press.mjs
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const out = "public/press";
fs.mkdirSync(out, { recursive: true });
const svg = fs.readFileSync("public/brand/logo-vector.svg", "utf8");
const COLORS = { yellow: "#FFF200", white: "#F2F0EA", black: "#090909" };

// Figure mark: SVG + 2000px PNG in three colours
for (const [name, hex] of Object.entries(COLORS)) {
  const s = svg.replace(/#f2f000/gi, hex);
  fs.writeFileSync(path.join(out, `REDACTED-mark-${name}.svg`), s);
  await sharp(Buffer.from(s)).resize({ height: 2000 }).png().toFile(path.join(out, `REDACTED-mark-${name}.png`));
}

// Wordmarks
await sharp("public/brand/logo-nav.avif").png().toFile(path.join(out, "REDACTED-wordmark-white.png"));
await sharp("public/brand/logo-hero.avif").png().toFile(path.join(out, "REDACTED-wordmark-outline.png"));
await sharp("public/brand/wordmark-black.png").resize({ width: 2000, withoutEnlargement: true }).png().toFile(path.join(out, "REDACTED-wordmark-black.png"));

// Show art and key art
const cover = "public/brand/showart-master.png";
await sharp(cover).resize({ width: 3000, height: 3000, fit: "cover", withoutEnlargement: true }).jpeg({ quality: 92 }).toFile(path.join(out, "REDACTED-show-art.jpg"));
await sharp("public/home/hero.avif").jpeg({ quality: 90 }).toFile(path.join(out, "REDACTED-key-art.jpg"));

// Laurels: individual + one strip
const laurels = fs.readdirSync("public/laurels").filter((f) => f.endsWith(".png")).sort();
for (const f of laurels) fs.copyFileSync(path.join("public/laurels", f), path.join(out, `laurel-${f}`));
// Each laurel is trimmed to its artwork, then fitted into an even cell so sizes and margins match.
const size = 600;
const inner = 500;
const cols = 8;
const rows = Math.ceil(laurels.length / cols);
const tiles = [];
for (const f of laurels) {
  const buf = await sharp(path.join("public/laurels", f)).trim().resize({ width: inner, height: inner, fit: "inside", withoutEnlargement: false }).png().toBuffer();
  const m = await sharp(buf).metadata();
  tiles.push({ buf, w: m.width, h: m.height });
}
await sharp({ create: { width: size * cols, height: size * rows, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles.map((t, i) => ({ input: t.buf, left: (i % cols) * size + Math.round((size - t.w) / 2), top: Math.floor(i / cols) * size + Math.round((size - t.h) / 2) })))
  .png()
  .toFile(path.join(out, "REDACTED-laurels-strip.png"));

console.log("press pack built:", fs.readdirSync(out).length, "files");
