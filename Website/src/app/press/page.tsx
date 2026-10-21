import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Image from "next/image";
import Link from "next/link";
import { SITE } from "@/lib/site";
import { PRESS_ZIP, QUOTES } from "@/data/press";
import coverage from "@/data/coverage.json";
import { Container } from "@/components/ui";
import { Laurels } from "@/components/Laurels";
import { PartnerForm } from "@/components/partner/PartnerForm";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const metadata: Metadata = {
  title: "Press: REDACTED in the news, reviews and awards",
  description: "Coverage, reviews and awards for REDACTED, the horror comedy audio drama from Hush Studios on the Rusty Quill Network, plus how to reach us for interviews and review copies.",
  alternates: { canonical: "/press" },
};

/** Section label + big Montserrat heading with the short yellow rule, same as the partner page. */
function Title({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow">{label}</p>
      <h2 className="mt-3 font-extrabold uppercase text-4xl sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight text-balance">{children}</h2>
      <span className="block mt-4 h-0.5 w-8 bg-yellow" aria-hidden />
    </div>
  );
}

/** The images a journalist is most likely to want, in the order they will want them. Everything else is on /assets. */
const IMAGES = [
  { file: "10212026_REDACTED_SignalAwards_Landscape.png", name: "Signal Awards announcement", note: "PNG, 1920×1080", wide: true },
  { file: "REDACTED-show-art.jpg", name: "Show art", note: "JPEG, 3000×3000 (art by 7cfc00)" },
  { file: "REDACTED-laurels-strip.png", name: "All laurels", note: "PNG, transparent", wide: true },
  { file: "REDACTED-wordmark-white.png", name: "Wordmark, white", note: "PNG, transparent" },
];

function sizeOf(file: string) {
  try {
    const b = fs.statSync(path.join(process.cwd(), "public/press", file)).size;
    return b >= 1_000_000 ? `${(b / 1_000_000).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1000))} KB`;
  } catch {
    return "";
  }
}

const fmt = (d: string) => {
  if (!d) return "";
  const parts = d.split("-").map(Number);
  const when = new Date(Date.UTC(parts[0], (parts[1] ?? 1) - 1, parts[2] ?? 1, 12));
  return when.toLocaleDateString("en-US", parts[2] ? { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" } : { month: "long", year: "numeric", timeZone: "UTC" });
};

export default async function PressPage() {
  await assertVisible("/press");

  return (
    <div className="[&_section]:scroll-mt-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Press", url: `${SITE.url}/press` }])} />

      {/* HEADER */}
      <section id="top" className="relative overflow-hidden border-b border-line">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute -top-24 left-1/2 -translate-x-1/4 w-[34rem] h-[34rem] rounded-full blur-3xl opacity-50" style={{ background: "radial-gradient(closest-side, rgba(255,150,0,0.45), rgba(255,60,0,0.12) 60%, transparent)" }} />
        </div>
        <Container className="relative py-12 sm:py-16 lg:py-20">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-yellow">Press</p>
          <h1 className="mt-3 font-extrabold uppercase text-5xl sm:text-6xl lg:text-7xl leading-[1.02] tracking-tight text-balance">REDACTED in the press</h1>
          <span className="block mt-4 h-0.5 w-8 bg-yellow" aria-hidden />
          <p className="mt-5 max-w-[56ch] text-[17px] font-light leading-relaxed text-paper/75">Reviews, coverage and awards for the horror comedy audio drama from Hush Studios on the Rusty Quill Network. For interviews, review copies or anything not listed, use the form below.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <a href="#contact" className="btn btn-yellow">
              Contact us
            </a>
            <a href="#images" className="btn btn-ghost">
              Press images
            </a>
          </div>
        </Container>
      </section>

      {/* COVERAGE */}
      <section id="coverage" className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Title label="Coverage">In the press</Title>
          <ul className="mt-10 border-t border-white/10">
            {coverage.map((c) => (
              <li key={c.url} className="border-b border-white/10">
                <a href={c.url} {...(c.url.startsWith("/") ? {} : { target: "_blank", rel: "noopener noreferrer" })} className="group grid gap-1 py-5 sm:grid-cols-[11rem_1fr_auto] sm:items-baseline sm:gap-6 hover:bg-white/[0.03] sm:px-3 -mx-1 px-1 transition-colors">
                  <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-yellow">{c.outlet}</span>
                  <span className="text-[17px] text-paper/90 group-hover:text-yellow transition-colors">
                    {c.title}
                    <span className="ml-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-paper/45">{c.kind}</span>
                  </span>
                  <span className="text-xs tabular text-paper/50 sm:text-right">{fmt(c.date)}</span>
                </a>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* QUOTES */}
      <section id="quotes" className="bg-red text-white">
        <Container className="py-14 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">Reception</p>
          <h2 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">What they&apos;re saying</h2>
          <span className="block mt-4 h-0.5 w-8 bg-yellow" aria-hidden />
          <ul className="mt-12 grid md:grid-cols-2 border-t border-white/15">
            {QUOTES.map((q, i) => (
              <li key={q.who} className={`py-8 md:px-8 ${i % 2 === 0 ? "md:pl-0 md:border-r border-white/15" : "md:pr-0"} ${i < QUOTES.length - 2 ? "border-b border-white/15" : ""}`}>
                <blockquote>
                  <p className="text-[15px] font-light leading-relaxed text-white/90">“{q.q}”</p>
                  <footer className="mt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-yellow">{q.who}</p>
                    <p className="mt-1 text-[11px] text-white/55">{q.role}</p>
                  </footer>
                </blockquote>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* AWARDS */}
      <section id="awards" className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Title label="Recognition">Winners</Title>
          <p className="mt-6 max-w-[60ch] text-[15px] font-light leading-relaxed text-paper/55">Silver Winner and Listener&apos;s Choice in Scripted Fiction at the 2026 Signal Awards, plus wins at five film festivals. The full list, with every nomination and selection, is on the <Link href="/partner#awards-strip" className="underline underline-offset-4 hover:text-yellow">partner page</Link>.</p>
          <Laurels only="wins" className="mt-10" />
        </Container>
      </section>

      {/* IMAGES */}
      <section id="images" className="border-b border-line">
        <Container className="py-14 sm:py-20">
          <Title label="Downloads">Press images</Title>
          <p className="mt-6 max-w-[60ch] text-[15px] font-light leading-relaxed text-paper/55">Free to use with coverage of REDACTED. Click an image to open it full size, or download it.</p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {IMAGES.map((f) => (
              <li key={f.file} className="border border-white/10 bg-white/[0.02]">
                <a href={`/press/${f.file}`} target="_blank" rel="noopener noreferrer" className="block bg-[#050505]">
                  <Image src={`/press/${f.file}`} alt={f.name} width={f.wide ? 960 : 600} height={f.wide ? 540 : 600} sizes="(min-width: 640px) 45vw, 100vw" className="mx-auto h-56 w-full object-contain" />
                </a>
                <div className="flex items-center justify-between gap-4 border-t border-white/10 p-4">
                  <div className="min-w-0">
                    <p className="font-semibold">{f.name}</p>
                    <p className="text-xs text-paper/50">
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
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <a href={`/press/${PRESS_ZIP}`} download className="btn btn-yellow">
              Download everything ({sizeOf(PRESS_ZIP)})
            </a>
            <a href="/press/10212026_REDACTED_SignalAwards_PressRelease.pdf" download className="btn btn-ghost">
              Signal Awards press release (PDF)
            </a>
            <Link href="/assets" className="text-sm text-paper/70 underline underline-offset-4 hover:text-yellow">
              More logos, colors and the fact sheet
            </Link>
          </div>
        </Container>
      </section>

      {/* CONTACT */}
      <section id="contact" className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" aria-hidden>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-[26rem] h-[18rem] blur-3xl opacity-70" style={{ background: "radial-gradient(closest-side, rgba(255,140,0,0.5), rgba(255,60,0,0.15) 60%, transparent)" }} />
        </div>
        <Container className="relative pt-28 pb-20 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-yellow">Get in touch</p>
          <h2 className="display mt-3 text-5xl sm:text-6xl lg:text-7xl">Press and questions</h2>
          <PartnerForm email={SITE.email} kind="press" />
        </Container>
      </section>
    </div>
  );
}
