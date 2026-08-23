import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { SITE, POLICY_UPDATED } from "@/lib/site";
import { BOILERPLATE, FACTS, LOGLINE, PALETTE, PRESS_GROUPS, PRESS_ZIP, hexToRgb } from "@/data/press";
import { Container } from "@/components/ui";
import { CopyButton } from "@/components/ListenLinks";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const metadata: Metadata = {
  title: "Brand Assets & Press Kit",
  description: "Logo pack, show art, laurels, colors, fonts, boilerplate, and usage rules for [REDACTED]. Free for press and non-commercial fan use.",
  alternates: { canonical: "/assets" },
};

/** Cache-buster so a regenerated file shows up without a hard refresh. */
function ver(file: string) {
  try {
    return Math.round(fs.statSync(path.join(process.cwd(), "public/press", file)).mtimeMs / 1000);
  } catch {
    return 0;
  }
}

function sizeOf(file: string) {
  try {
    const b = fs.statSync(path.join(process.cwd(), "public/press", file)).size;
    return b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`;
  } catch {
    return "";
  }
}

const RULES: { ok: boolean; text: string }[] = [
  { ok: true, text: "Use the mark or the wordmark as supplied, in yellow, white, or black." },
  { ok: true, text: "Keep clear space around the logo at least the height of one bracket." },
  { ok: true, text: "Minimum size: 24px tall on screen, 10mm in print." },
  { ok: true, text: "Write the title as [REDACTED] or REDACTED. Brackets are always the same color as the word." },
  { ok: true, text: "Fan art, edits, cosplay, and non-commercial use with a credit are welcome." },
  { ok: false, text: "Don't recolor, stretch, rotate, outline, or add effects to the logo." },
  { ok: false, text: "Don't put the yellow mark on yellow, or the black mark on dark backgrounds." },
  { ok: false, text: "Don't use our art or logo on merchandise or anything for sale." },
  { ok: false, text: "Don't imply we endorse or made something we didn't." },
];

export default function AssetsPage() {
  const fact = FACTS.map(([k, v]) => `${k}: ${v}`).join("\n");
  return (
    <Container className="py-10 sm:py-16 max-w-5xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Assets", url: `${SITE.url}/assets` }])} />
      <p className="eyebrow">Press and brand</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Assets</h1>
      <p className="mt-4 text-lg text-paper/90 max-w-prose">Everything you need to write about, stream, or make things for [REDACTED]. Take what you need; the only ask is that the logo stays as it is.</p>
      <div className="mt-6 flex flex-wrap items-center gap-4">
        <a href={`/press/${PRESS_ZIP}`} download className="btn btn-yellow">
          Download everything ({sizeOf(PRESS_ZIP)})
        </a>
        <span className="text-sm text-muted">Logos, art, laurels. Updated {POLICY_UPDATED}.</span>
      </div>

      {/* Files */}
      {PRESS_GROUPS.map((g) => (
        <section key={g.title} className="mt-14">
          <h2 className="display text-3xl">{g.title}</h2>
          <p className="mt-1 text-sm text-muted">{g.blurb}</p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.files.map((f) => (
              <li key={f.file} className={`bg-ink-2 border border-line flex flex-col ${f.wide ? "sm:col-span-2 lg:col-span-3" : ""}`}>
                {f.preview && (
                  <div className={`relative ${f.wide ? "aspect-[4/1]" : "aspect-[4/3]"} ${f.dark === false ? "bg-[#f3f3f3]" : "bg-[conic-gradient(#1c1818_25%,#141111_0_50%,#1c1818_0_75%,#141111_0)] bg-[length:24px_24px]"}`}>
                    <Image src={`/press/${f.file}?v=${ver(f.file)}`} alt={f.name} fill sizes={f.wide ? "100vw" : "(min-width:1024px) 33vw, 50vw"} className={`object-contain ${f.wide ? "p-3" : "p-6"}`} unoptimized={f.file.endsWith(".svg")} />
                  </div>
                )}
                <div className="p-4 flex items-center justify-between gap-3 mt-auto">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{f.name}</p>
                    <p className="text-xs text-muted">
                      {f.note}
                      {sizeOf(f.file) ? ` · ${sizeOf(f.file)}` : ""}
                    </p>
                  </div>
                  <a href={`/press/${f.file}`} download className="btn btn-ghost !min-h-10 !text-base !px-3 shrink-0">
                    Download
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      {/* Usage */}
      <section className="mt-14">
        <h2 className="display text-3xl">Using the logo</h2>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {RULES.map((r) => (
            <li key={r.text} className={`flex gap-3 border p-3 text-sm ${r.ok ? "border-line bg-ink-2/70" : "border-red/50 bg-red/5"}`}>
              <span className={`display text-xl leading-none ${r.ok ? "text-yellow" : "text-red-2"}`} aria-hidden>
                {r.ok ? "Do" : "Don't"}
              </span>
              <span className="text-paper/90">{r.text}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Colors */}
      <section className="mt-14">
        <h2 className="display text-3xl">Colors</h2>
        <p className="mt-1 text-sm text-muted">The site is dark only. Yellow is the accent; red is for warnings and Postmortem.</p>
        <ul className="mt-5 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
          {PALETTE.map((c) => (
            <li key={c.hex} className="border border-line bg-ink-2">
              <div className="h-24 border-b border-line" style={{ background: c.hex }} />
              <div className="p-3">
                <p className="display text-xl">{c.name}</p>
                <p className="text-xs text-muted tabular">
                  {c.hex} · rgb({hexToRgb(c.hex)})
                </p>
                <p className="text-xs text-paper/70 mt-1">{c.use}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Fonts */}
      <section className="mt-14">
        <h2 className="display text-3xl">Fonts</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="bg-ink-2 border border-line p-6">
            <p className="display text-5xl">NK57 Monospace</p>
            <p className="text-sm text-muted mt-2">Semi-Condensed Bold, headings and display. Licensed to us; not for redistribution. If you need a substitute, use Montserrat Bold in caps.</p>
          </div>
          <a href="https://fonts.google.com/specimen/Montserrat" target="_blank" rel="noreferrer" className="block bg-ink-2 border border-line p-6 hover:border-yellow">
            <p className="text-4xl font-semibold">Montserrat</p>
            <p className="text-sm text-muted mt-2">Body copy. Free on Google Fonts.</p>
          </a>
        </div>
      </section>

      {/* Copy */}
      <section className="mt-14 grid gap-8 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="display text-3xl">Boilerplate</h2>
            <CopyButton text={BOILERPLATE} label="Copy" className="btn btn-ghost !min-h-9 !text-sm" />
          </div>
          <p className="mt-3 text-paper/85">{BOILERPLATE}</p>
          <h3 className="eyebrow mt-6">Logline</h3>
          <p className="mt-1 text-paper/85">{LOGLINE}</p>
        </div>
        <div>
          <div className="flex items-center justify-between gap-4">
            <h2 className="display text-3xl">Fact sheet</h2>
            <CopyButton text={fact} label="Copy" className="btn btn-ghost !min-h-9 !text-sm" />
          </div>
          <dl className="mt-3 grid grid-cols-[max-content_1fr] gap-x-5 gap-y-1.5 text-sm">
            {FACTS.map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow pt-1">{k}</dt>
                <dd className="text-paper/85">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <p className="mt-14 border-t border-line pt-6 text-sm text-muted">
        Show art by{" "}
        <a href={SITE.showArtist.url} target="_blank" rel="noreferrer" className="underline hover:text-yellow">
          {SITE.showArtist.name}
        </a>
        . Stats, reviews, and sponsorship options are on the{" "}
        <Link href="/partner" className="underline hover:text-yellow">
          partner page
        </Link>
        . Anything else:{" "}
        <a href={`mailto:${SITE.email}?subject=Press`} className="underline hover:text-yellow">
          {SITE.email}
        </a>
        .
      </p>
    </Container>
  );
}
