import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getEpisodes, formatDate, formatDuration } from "@/lib/feed";
import { getPlatformLinks } from "@/lib/episodeLinks";
import { EVENT_CTA, eventPlatforms, eventSlug, partLabel } from "@/lib/eventPlatforms";
import { SITE } from "@/lib/site";
import { Container, Crumbs, PlatformButtons } from "@/components/ui";
import { Arrow } from "@/components/Icons";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";

export const revalidate = 3600;

async function partsOf(slug: string) {
  const { specials } = await getEpisodes();
  return specials.filter((e) => eventSlug(e.special!.event) === slug).sort((a, b) => +new Date(a.date) - +new Date(b.date));
}

export async function generateStaticParams() {
  try {
    const { specials } = await getEpisodes();
    return Array.from(new Set(specials.map((e) => eventSlug(e.special!.event)))).map((slug) => ({ slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const parts = await partsOf(slug).catch(() => []);
  if (!parts.length) return {};
  const name = parts[0].special!.event;
  // The description is the first part's own lede from the feed, not copy written for this page.
  const desc = parts[0].summary.slice(0, 300);
  return {
    title: name,
    description: desc,
    alternates: { canonical: `/events/${slug}` },
    openGraph: { siteName: "REDACTED", title: `REDACTED: ${name}`, description: desc, type: "website", images: [{ url: `https://i.ytimg.com/vi/${parts[0].special!.video}/hqdefault.jpg`, width: 480, height: 360 }] },
  };
}

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const parts = await partsOf(slug);
  if (!parts.length) notFound();
  const name = parts[0].special!.event;
  const cta = EVENT_CTA[name];
  const links = await Promise.all(parts.map((e) => getPlatformLinks(e.title).catch(() => ({}))));
  const url = `${SITE.url}/events/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    url,
    hasPart: parts.map((e) => ({
      "@type": "VideoObject",
      name: e.title,
      description: e.summary || e.title,
      thumbnailUrl: `https://i.ytimg.com/vi/${e.special!.video}/hqdefault.jpg`,
      uploadDate: e.date,
      embedUrl: `https://www.youtube-nocookie.com/embed/${e.special!.video}`,
      contentUrl: `https://www.youtube.com/watch?v=${e.special!.video}`,
    })),
  };

  return (
    <article>
      <JsonLd data={jsonLd} />
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Episodes", url: `${SITE.url}/episodes` }, { name: "Special Events", url: `${SITE.url}/episodes?show=events` }, { name, url }])} />

      <div className="border-b border-line bg-ink-2/60">
        <Container className="py-8 sm:py-12">
          <Crumbs items={[{ label: "Episodes", href: "/episodes" }, { label: "Special Events", href: "/episodes?show=events" }, { label: name }]} />
          <p className="eyebrow text-yellow mt-6">Special Event</p>
          <h1 className="display hero-title text-5xl sm:text-7xl mt-1">{name}</h1>
          {parts[0].summary && <p className="mt-4 text-lg text-paper/85 max-w-prose">{parts[0].summary}</p>}
          {cta && (
            <a href={cta.href} target="_blank" rel="noreferrer" className="btn btn-yellow mt-6 w-full sm:w-auto !min-h-14 !px-8 !text-xl justify-center">
              {cta.label} <Arrow width={20} height={20} />
            </a>
          )}
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        <ol className="grid gap-6 lg:grid-cols-2">
          {parts.map((e, i) => (
            <li key={e.guid} className="bg-ink-2/70 border border-line">
              <div className="aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${e.special!.video}?rel=0&modestbranding=1&color=white`}
                  title={`${name}, ${partLabel(e)}`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                  className="w-full h-full"
                />
              </div>
              <div className="p-4 sm:p-5">
                <p className="eyebrow text-yellow">
                  {partLabel(e)} · {formatDate(e.date)}
                  {e.duration ? ` · ${formatDuration(e.duration)}` : ""}
                </p>
                <h2 className="display text-2xl sm:text-3xl leading-none mt-1">
                  <Link href={`/episodes/${e.slug}`} className="hover:text-yellow">
                    {e.title}
                  </Link>
                </h2>
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <PlatformButtons size="sm" links={eventPlatforms(e, links[i])} label="Watch or listen on" />
                  <Link href={`/episodes/${e.slug}`} className="text-sm text-paper/80 hover:text-yellow underline underline-offset-4">
                    Episode page
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Container>
    </article>
  );
}
