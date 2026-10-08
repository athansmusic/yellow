import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import seed from "@/data/aberrations.json";
import { getDoc, designationClasses, ABERRATION_CLASSES, type Aberration } from "@/lib/content";
import { getAllItems, formatDate, toTrack, type Episode } from "@/lib/feed";
import { SITE } from "@/lib/site";
import { Container, Crumbs } from "@/components/ui";
import { PlayButton } from "@/components/AudioPlayer";
import { Declassify } from "@/components/Declassify";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const revalidate = 3600;
export const dynamicParams = true;
export function generateStaticParams() {
  return seed.map((a) => ({ slug: a.slug }));
}

const norm = (s?: string) => (s ?? "").toLowerCase().replace(/[\s:]+/g, "");
const stripPart = (s: string) => s.replace(/\s*\(part \d+\)\s*$/i, "");
const isDraft = (s?: string) => !!s && s.startsWith("REPLACE ME");

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = (await getDoc("aberrations")).find((x) => x.slug === slug);
  if (!a) return {};
  return {
    title: `${a.name} · ${a.designation} · Aberration`,
    description: `${a.teaser || `${a.name}, designation ${a.designation}, an aberration from the horror comedy podcast REDACTED.`} From ${a.episodeCode.replace(" ", "")}.`,
    alternates: { canonical: `/aberrations/${a.slug}` },
  };
}

/** Episodes this aberration turns up in: the main one, any extras, and their Postmortems. */
function episodesFor(a: Aberration, all: Episode[]) {
  const codes = [a.episodeCode, ...(a.alsoIn ?? [])].map(norm);
  const eps = all.filter((e) => e.kind === "episode" && codes.includes(norm(e.code)));
  const pms = all.filter((e) => e.kind === "postmortem");
  return eps
    .map((ep) => ({ ep, pm: pms.find((p) => norm(p.shortTitle) === norm(ep.shortTitle)) ?? pms.find((p) => norm(stripPart(p.shortTitle)) === norm(stripPart(ep.shortTitle))) }))
    .sort((x, y) => +new Date(x.ep.date) - +new Date(y.ep.date));
}

function Row({ label, children, classified = false }: { label: string; children: React.ReactNode; classified?: boolean }) {
  return (
    <div className="border-b border-line/60 py-3 grid gap-1 sm:grid-cols-[10rem_1fr]">
      <dt className="crt-text text-[11px] tracking-[0.25em] uppercase opacity-70 pt-0.5">{label}</dt>
      <dd className={classified ? "classified" : ""}>{children}</dd>
    </div>
  );
}

export default async function AberrationPage({ params }: { params: Promise<{ slug: string }> }) {
  await assertVisible("/aberrations");
  const { slug } = await params;
  const [aberrations, all] = await Promise.all([getDoc("aberrations"), getAllItems().catch(() => [] as Episode[])]);
  const a = aberrations.find((x) => x.slug === slug);
  if (!a) notFound();
  const appearances = episodesFor(a, all);
  const first = appearances[0]?.ep;
  const classes = designationClasses(a.designation);
  const related = (a.related ?? []).map((s) => aberrations.find((x) => x.slug === s)).filter((x): x is Aberration => !!x);
  const paragraphs = isDraft(a.entry) ? [] : a.entry.split(/\n\s*\n/).filter(Boolean);
  const notes = a.notes && !isDraft(a.notes) ? a.notes.split(/\n\s*\n/).filter(Boolean) : [];
  const handling = isDraft(a.handling) ? undefined : a.handling;
  const teaser = a.teaser;

  return (
    <article>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Aberrations", url: `${SITE.url}/aberrations` }, { name: a.name, url: `${SITE.url}/aberrations/${a.slug}` }])} />

      <Container className="py-8 sm:py-12">
        <Crumbs items={[{ label: "Aberrations", href: "/aberrations" }, { label: a.name }]} />

        <div className="crt relative mt-6 border border-line bg-black">
          <div className="crt-scan pointer-events-none absolute inset-0" aria-hidden />
          <div className="relative grid gap-8 p-5 sm:p-8 md:grid-cols-[minmax(0,18rem)_1fr] items-start">
            {/* Visual record */}
            <div className="relative aspect-[4/5] border border-line/60 bg-black overflow-hidden">
              {a.image ? (
                <Image src={a.image} alt={a.name} fill priority sizes="(min-width:768px) 18rem, 100vw" className="object-cover" />
              ) : (
                <div className="absolute inset-0 grid place-items-center">
                  <span className="display text-4xl text-paper/40">REDACTED</span>
                </div>
              )}
            </div>

            {/* Record header */}
            <div className="crt-text">
              <p className="text-[11px] tracking-[0.3em] uppercase opacity-70">TRU record</p>
              <p className="font-mono text-2xl sm:text-3xl mt-1 tabular">{a.designation}</p>
              <h1 className="display text-5xl sm:text-7xl mt-1 text-paper">{a.name}</h1>
              {a.aliases && a.aliases.length > 0 && <p className="mt-2 text-sm opacity-80">Also logged as {a.aliases.join(", ")}</p>}

              <dl className="mt-6 grid gap-0">
                <Row label="Classification">
                  {classes.length ? (
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {classes.map((c) => (
                        <li key={c} className="flex items-baseline gap-1.5">
                          <span className="font-mono text-yellow">{c}</span>
                          <span className="text-sm">{ABERRATION_CLASSES[c]}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-sm opacity-80">{/^unknown/i.test(a.designation) ? a.designation : "Pending classification"}</span>
                  )}
                </Row>
                {first && (
                  <Row label="First encountered">
                    <span className="text-sm flex items-center gap-3">
                      <Link href={`/episodes/${first.slug}`} className="text-paper underline underline-offset-4 hover:text-yellow">
                        {first.code}: {first.shortTitle}
                      </Link>
                      <PlayButton track={toTrack(first)} size="sm" />
                    </span>
                  </Row>
                )}
              </dl>
              {teaser && <p className="mt-5 text-paper/90 max-w-prose">{teaser}</p>}
            </div>
          </div>

          {/* The classified body */}
          <div className="relative border-t border-line px-5 sm:px-8 py-6">
            <Declassify id={a.slug}>
              <dl className="mt-2">
                <Row label="Description" classified>
                  {paragraphs.length ? (
                    <div className="grid gap-3 text-paper/90 max-w-prose">
                      {paragraphs.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted">No description on record yet.</p>
                  )}
                </Row>
                {notes.length > 0 && (
                  <Row label="Notes" classified>
                    <div className="grid gap-3 text-paper/90 max-w-prose">
                      {notes.map((p, i) => (
                        <p key={i}>{p}</p>
                      ))}
                    </div>
                  </Row>
                )}
                {handling && (
                  <Row label="Handling" classified>
                    <p className="text-paper/90 max-w-prose">{handling}</p>
                  </Row>
                )}
              </dl>
            </Declassify>

            {appearances.length > 0 && (
              <details className="group mt-8 border border-line/60">
                <summary className="cursor-pointer list-none p-4 flex items-center justify-between gap-4 crt-text">
                  <span className="display text-2xl">
                    Episodes containing {a.name} <span className="font-sans text-sm normal-case opacity-70">({appearances.length})</span>
                  </span>
                  <span aria-hidden className="text-yellow text-3xl leading-none transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <ul className="divide-y divide-line/60 border-t border-line/60">
                  {appearances.map(({ ep, pm }) => (
                    <li key={ep.guid} className="p-4 grid gap-3 sm:grid-cols-2">
                      <div className="flex items-center gap-3">
                        <PlayButton track={toTrack(ep)} size="sm" />
                        <div className="min-w-0">
                          <Link href={`/episodes/${ep.slug}`} className="display text-xl block hover:text-yellow">
                            {ep.code}: {ep.shortTitle}
                          </Link>
                          <p className="text-xs text-muted">{formatDate(ep.date)}</p>
                        </div>
                      </div>
                      {pm && (
                        <div className="flex items-center gap-3">
                          <PlayButton track={toTrack(pm)} size="sm" />
                          <div className="min-w-0">
                            <Link href={`/episodes/${pm.slug}`} className="display text-xl block hover:text-yellow">
                              {pm.title}
                            </Link>
                            <p className="text-xs text-muted">Debrief · {formatDate(pm.date)}</p>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {related.length > 0 && (
              <div className="mt-8">
                <p className="crt-text text-[11px] tracking-[0.25em] uppercase opacity-70 mb-2">Related records</p>
                <ul className="flex flex-wrap gap-2">
                  {related.map((r) => (
                    <li key={r.slug}>
                      <Link href={`/aberrations/${r.slug}`} className="inline-flex items-baseline gap-2 border border-line/60 px-3 py-1.5 hover:border-yellow hover:text-yellow">
                        <span className="font-mono text-xs">{r.designation}</span>
                        <span className="display text-lg">{r.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6">
          <Link href="/aberrations" className="text-sm text-muted underline underline-offset-4 hover:text-yellow">
            Back to the records
          </Link>
        </p>
      </Container>
    </article>
  );
}
