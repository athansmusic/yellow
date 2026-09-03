import type { Metadata } from "next";
import { getDoc } from "@/lib/content";
import { getAllItems, type Episode } from "@/lib/feed";
import { SITE } from "@/lib/site";
import { Container } from "@/components/ui";
import { AberrationDial } from "@/components/AberrationDial";
import { JsonLd, breadcrumbJsonLd } from "@/lib/schema";
import { assertVisible } from "@/lib/visibility";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Aberrations",
  description: "The REDACTED Unit's records: every aberration the team has encountered, by designation and classification (physical, spatial, cognitive, quantum, temporal), with the episodes they appear in.",
  alternates: { canonical: "/aberrations" },
};

const key = (code?: string) => (code ?? "").toLowerCase().replace(/\s+/g, "");

export default async function AberrationsIndex() {
  await assertVisible("/aberrations");
  const [all, aberrations] = await Promise.all([getAllItems().catch(() => [] as Episode[]), getDoc("aberrations")]);
  const byCode = new Map(all.filter((e) => e.kind === "episode").map((e) => [key(e.code), e]));
  // Order by designation number; records without a number (Pending / Unknown) go last, by episode
  const num = (d: string) => {
    const m = d.match(/-(\d+)/);
    return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
  };
  const items = [...aberrations]
    .sort((x, y) => num(x.designation) - num(y.designation) || (byCode.get(key(x.episodeCode))?.number ?? 0) - (byCode.get(key(y.episodeCode))?.number ?? 0))
    .map((a) => {
      const ep = byCode.get(key(a.episodeCode));
      return { slug: a.slug, name: a.name, designation: a.designation, subject: a.subject, episodeCode: a.episodeCode, episodeTitle: ep?.shortTitle, teaser: a.teaser };
    });

  return (
    <Container className="py-10 sm:py-16">
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", url: SITE.url }, { name: "Aberrations", url: `${SITE.url}/aberrations` }])} />
      <JsonLd data={{ "@context": "https://schema.org", "@type": "ItemList", name: "Aberrations in REDACTED", itemListElement: items.map((a, i) => ({ "@type": "ListItem", position: i + 1, name: a.name, url: `${SITE.url}/aberrations/${a.slug}` })) }} />

      <p className="eyebrow">CRT records</p>
      <h1 className="display text-5xl sm:text-7xl mt-2">Aberrations</h1>
      <p className="mt-4 max-w-2xl text-lg text-paper/90">Dial a classification to pull the matching records. Each dossier keeps its spoilers redacted until you declassify it.</p>

      <div className="mt-8">
        <AberrationDial items={items} />
      </div>
    </Container>
  );
}
