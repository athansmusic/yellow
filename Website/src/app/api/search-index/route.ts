import { NextResponse } from "next/server";
import { getAllItems } from "@/lib/feed";
import { getProducts } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { COLLECTIONS, subLabel } from "@/lib/storeTaxonomy";
import cast from "@/data/cast.json";
import { QA } from "@/data/faq";

export const revalidate = 600;

export type SearchItem = {
  type: "episode" | "postmortem" | "minisode" | "cast" | "aberration" | "like" | "faq" | "product" | "page";
  title: string;
  subtitle?: string;
  url: string;
  image?: string;
  /** Searchable fields in priority order: [label, text] pairs; the label is shown as "matched: …" */
  fields: [string, string][];
};

/** Everything site search can find, as one small JSON document. Cached ten minutes. */
export async function GET() {
  const [items, products, aberrations, like] = await Promise.all([getAllItems().catch(() => []), getProducts().catch(() => []), getDoc("aberrations").catch(() => []), getDoc("like").catch(() => [])]);
  const out: SearchItem[] = [];

  for (const e of items) {
    if (e.kind === "trailer" || /^we recommend/i.test(e.title)) continue;
    const title = e.kind === "episode" ? `${e.code}: ${e.shortTitle}` : e.title;
    out.push({
      type: e.kind === "episode" ? "episode" : e.kind === "postmortem" ? "postmortem" : "minisode",
      title,
      subtitle: e.summary,
      url: `/episodes/${e.slug}`,
      image: e.image,
      fields: [
        ["title", title],
        ["guest director", e.guestDirector ?? ""],
        ["cast", e.starring.join(", ")],
        ["content warnings", e.contentWarnings ?? ""],
        ["summary", e.summary],
      ],
    });
  }
  for (const c of cast) {
    const other = (c.otherWork as { title: string; note?: string }[]).map((w) => w.title).join(", ");
    out.push({ type: "cast", title: c.actor, subtitle: c.character, url: `/cast/${c.slug}`, image: c.image, fields: [["name", c.actor], ["character", c.character], ["also heard in", other], ["bio", `${c.about ?? ""} ${c.bio ?? ""}`]] });
  }
  for (const a of aberrations) out.push({ type: "aberration", title: a.name, subtitle: `${a.designation} · ${a.episodeCode}`, url: `/aberrations/${a.slug}`, fields: [["name", a.name], ["designation", a.designation], ["teaser", a.teaser]] });
  for (const l of like) out.push({ type: "like", title: l.title, subtitle: l.name, url: `/like/${l.slug}`, fields: [["title", `${l.name} ${l.title}`], ["description", l.description]] });
  for (const q of QA) out.push({ type: "faq", title: q.q, subtitle: q.a, url: "/faq", fields: [["question", q.q], ["answer", q.a]] });
  for (const p of products) {
    const col = COLLECTIONS.find((c) => c.match.test(p.name))?.label ?? "";
    out.push({ type: "product", title: p.name, subtitle: col || subLabel(p.category, p.sub), url: `/store/${p.slug}`, image: p.image, fields: [["name", p.name], ["collection", col], ["category", `${p.category} ${subLabel(p.category, p.sub)}`], ["tags", p.tags.join(", ")], ["description", p.description]] });
  }
  const pages: [string, string, string][] = [
    ["About the show", "/about", "what is REDACTED horror comedy audio drama Hush Studios Rusty Quill creators Athan Jamie Petronis"],
    ["Where to listen", "/where", "apps Spotify Apple Podcasts Akouva YouTube RSS Overcast Pocket Casts Patreon feed"],
    ["Partner with us", "/partner", "advertise sponsorship media kit audience stats press kit"],
    ["Brand assets", "/assets", "logo fonts colors press downloads"],
    ["Store FAQ and shipping", "/store-faq", "shipping delivery returns sizing print on demand"],
    ["Supporter wall", "/supporter-wall", "Kickstarter backers thank you"],
  ];
  for (const [title, url, text] of pages) out.push({ type: "page", title, url, fields: [["title", title], ["about", text]] });

  return NextResponse.json(out, { headers: { "cache-control": "public, max-age=600, s-maxage=600" } });
}
