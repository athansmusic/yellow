import { LISTEN, SITE } from "./site";
import awards from "@/data/awards.json";

export const AWARD_STRINGS = awards.map((a) => `${a.festival} ${a.year}: ${a.result}`);

/** Organization + PodcastSeries, emitted on every page so crawlers and LLMs have a stable entity. */
export function siteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE.url}/#org`,
        name: "Hush Studios",
        url: SITE.studio.url,
        email: SITE.email,
        logo: `${SITE.url}/brand/share.jpg`,
        sameAs: ["https://x.com/TheRedactedUnit", "https://bsky.app/profile/theredactedunit.com", "https://www.youtube.com/@hushstudiosofficial", "https://www.tiktok.com/@theredactedunit", "https://patreon.com/TheRedactedUnit"],
      },
      {
        "@type": "PodcastSeries",
        "@id": `${SITE.url}/#series`,
        name: "REDACTED",
        alternateName: ["REDACTED", "The REDACTED Unit", "REDACTED podcast"],
        url: SITE.url,
        image: `${SITE.url}/brand/showart.jpeg`,
        description:
          "REDACTED is a horror comedy audio drama (fiction podcast) from Hush Studios on the Rusty Quill network. Failed actor Jacob Kane assumes his dead twin's identity and lands in The REDACTED Unit, an underfunded secret agency that handles paranormal cases called Aberrations. Monster-of-the-week, serialized, new episodes Fridays 9/8c.",
        genre: ["Horror", "Comedy", "Audio Drama", "Fiction Podcast"],
        inLanguage: "en",
        webFeed: LISTEN.rss,
        productionCompany: { "@id": `${SITE.url}/#org` },
        publisher: { "@type": "Organization", name: "Rusty Quill", url: SITE.network.url },
        author: [
          { "@type": "Person", name: "Athan (Johnathan Magno)" },
          { "@type": "Person", name: "Jamie Petronis" },
        ],
        sameAs: [LISTEN.spotify, LISTEN.apple, LISTEN.acast],
        award: AWARD_STRINGS,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE.url}/#website`,
        url: SITE.url,
        name: "REDACTED",
        publisher: { "@id": `${SITE.url}/#org` },
      },
    ],
  };
}

/** Audience figures attached to the series entity, so "how big is the REDACTED podcast" is answerable from the page. */
export function audienceJsonLd(s: { totalPlays?: number; dailyAverage?: number; followers?: number; discordMembers?: number; lastUpdated?: string }) {
  const stat = (type: string, count: number | undefined, name?: string) =>
    count != null ? { "@type": "InteractionCounter", interactionType: { "@type": type }, userInteractionCount: count, ...(name ? { name } : {}) } : null;
  return {
    "@context": "https://schema.org",
    "@type": "PodcastSeries",
    "@id": `${SITE.url}/#series`,
    name: "REDACTED",
    url: SITE.url,
    interactionStatistic: [stat("ListenAction", s.totalPlays, "Total plays"), stat("ListenAction", s.dailyAverage, "Average daily plays"), stat("FollowAction", s.followers, "Apple Podcasts and Spotify followers"), stat("JoinAction", s.discordMembers, "Discord members")].filter(Boolean),
    audience: {
      "@type": "PeopleAudience",
      audienceType: "Fans of procedural genre television (The X-Files, Buffy the Vampire Slayer, Brooklyn Nine-Nine, Psych) and horror audio drama (The Magnus Archives, SCP Archives)",
      suggestedMinAge: 18,
      geographicArea: [{ "@type": "Country", name: "United States" }, { "@type": "Country", name: "United Kingdom" }, { "@type": "Country", name: "Canada" }, { "@type": "Country", name: "Australia" }, { "@type": "Country", name: "Germany" }],
    },
    ...(s.lastUpdated ? { dateModified: s.lastUpdated } : {}),
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.name, item: it.url })),
  };
}

export function faqJsonLd(qa: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qa.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}
