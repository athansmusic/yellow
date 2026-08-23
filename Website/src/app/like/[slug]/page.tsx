import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import seed from "@/data/like.json";
import { getDoc } from "@/lib/content";
import { getAllItems, toTrack } from "@/lib/feed";
import { EXTERNAL, LISTEN_BUTTONS, SITE } from "@/lib/site";
import { Container, PlatformButtons } from "@/components/ui";
import { PlayButton } from "@/components/AudioPlayer";
import { StickyStart } from "@/components/StickyStart";
import { JsonLd, breadcrumbJsonLd, faqJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const dynamicParams = true;
export const revalidate = 60;
export function generateStaticParams() {
  return seed.map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const l = (await getDoc("like")).find((x) => x.slug === slug);
  if (!l) return {};
  return { title: l.title, description: l.description, alternates: { canonical: `/like/${l.slug}` } };
}

/** "Same network. [REDACTED] is on Rusty Quill…" -> ["Same network.", "[REDACTED] is on Rusty Quill…"] */
function split(point: string): [string, string] {
  const m = point.match(/^(.{3,80}?[.!?])\s+([\s\S]+)$/);
  return m ? [m[1], m[2]] : [point, ""];
}

function Points({ items, accent }: { items: string[]; accent: boolean }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {items.map((p) => {
        const [lead, rest] = split(p);
        return (
          <li key={p} className={`border-l-2 pl-4 ${accent ? "border-yellow" : "border-line"}`}>
            <p className="display text-2xl">{lead}</p>
            {rest && <p className="mt-1 text-sm text-paper/80">{rest}</p>}
          </li>
        );
      })}
    </ul>
  );
}

export default async function LikePage({ params }: { params: Promise<{ slug: string }> }) {
  await assertVisible("/like");
  const { slug } = await params;
  const like = await getDoc("like");
  const l = like.find((x) => x.slug === slug);
  if (!l) notFound();
  const norm = (x?: string) => (x ?? "").toLowerCase().replace(/[\s:]+/g, "");
  const all = await getAllItems().catch(() => []);
  const startEp = all.find((e) => e.kind === "episode" && norm(e.code) === norm(l.startEpisode ?? "S1 E1"));
  const others = like.filter((x) => x.slug !== l.slug);
  const facts = (l.facts ?? []).filter((f) => f.label);

  return (
    <Container className="py-10 sm:py-16 max-w-5xl">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "If you like", url: `${SITE.url}/like` }, { name: l.name, url: `${SITE.url}/like/${l.slug}` }])} />
      <JsonLd data={faqJsonLd(l.faq)} />

      <p className="eyebrow">If you like {l.name}</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">[REDACTED], for fans of {l.name}</h1>
      <p className="mt-5 text-lg text-paper/90 max-w-prose">{l.description}</p>

      {/* Start block: trailer beside the play button */}
      <section id="start" className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_1fr] items-center border border-line bg-ink-2/70 p-5 sm:p-6">
        <div className="aspect-video bg-black border border-line">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${EXTERNAL.trailerYouTubeId}?rel=0&modestbranding=1&color=white`}
            title="[REDACTED] teaser trailer"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            className="w-full h-full"
          />
        </div>
        <div>
          <h2 className="eyebrow mb-2">Where to start</h2>
          <p className="text-paper/90">{l.start}</p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {startEp ? (
              <PlayButton track={toTrack(startEp)} plain label={`Play ${startEp.code}`} className="btn btn-yellow" />
            ) : (
              <Link href="/episodes" className="btn btn-yellow">
                Episode 1
              </Link>
            )}
            <PlatformButtons links={LISTEN_BUTTONS} size="sm" />
          </div>
          {l.quote && (
            <blockquote className="mt-6 border-l-2 border-yellow pl-4">
              <p className="text-paper/90">“{l.quote.text}”</p>
              <footer className="mt-1 text-xs text-muted">
                {l.quote.who}, {l.quote.role}
              </footer>
            </blockquote>
          )}
        </div>
      </section>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_18rem] items-start">
        <div className="grid gap-12">
          <section className="prose-site">
            <h2 className="eyebrow mb-3">What {l.name} is</h2>
            <p>{l.about}</p>
          </section>

          {facts.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Side by side</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-t border-line">
                  <thead>
                    <tr className="text-left">
                      <th className="py-2 pr-4 w-32"></th>
                      <th className="py-2 pr-4 display text-xl font-normal">{l.name}</th>
                      <th className="py-2 display text-xl font-normal">[REDACTED]</th>
                    </tr>
                  </thead>
                  <tbody>
                    {facts.map((f) => (
                      <tr key={f.label} className="border-t border-line align-top">
                        <th scope="row" className="py-2.5 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-muted">
                          {f.label}
                        </th>
                        <td className="py-2.5 pr-4 text-paper/85">{f.theirs}</td>
                        <td className="py-2.5 text-paper">{f.ours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <section>
            <h2 className="eyebrow mb-4">What [REDACTED] has in common</h2>
            <Points items={l.same} accent />
          </section>

          <section>
            <h2 className="eyebrow mb-4">What&apos;s different</h2>
            <Points items={l.different} accent={false} />
          </section>

          {l.faq.length > 0 && (
            <section>
              <h2 className="eyebrow mb-3">Questions</h2>
              <dl className="divide-y divide-line border-y border-line">
                {l.faq.map((f) => (
                  <div key={f.q} className="py-4">
                    <dt className="font-semibold">{f.q}</dt>
                    <dd className="mt-1 text-paper/85">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="lg:sticky lg:top-24 grid gap-4">
          <Image src="/brand/showart.jpeg" alt="[REDACTED] show art" width={500} height={500} className="w-full border border-line" />
          <p className="text-sm text-paper/85">A horror comedy audio drama from Hush Studios on the Rusty Quill network. New episodes Fridays 9/8c.</p>
          <Link href="/about" className="text-sm text-yellow underline underline-offset-4">
            About the show
          </Link>
        </aside>
      </div>

      {others.length > 0 && (
        <section className="mt-14 border-t border-line pt-8">
          <h2 className="eyebrow mb-4">Coming from something else?</h2>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/like/${o.slug}`} className="block border border-line bg-ink-2/70 p-3 hover:border-yellow">
                  <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-yellow">{o.kind ?? "podcast"}</span>
                  <span className="display text-xl block">{o.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {startEp && <StickyStart track={toTrack(startEp)} label={`Start with ${startEp.code}`} afterId="start" />}
    </Container>
  );
}
