import type { MetadataRoute } from "next";
import { getDoc } from "@/lib/content";
import { getAllItems } from "@/lib/feed";
import { hiddenPages, isHiddenPath } from "@/lib/visibility";
import { getProducts } from "@/lib/catalog";
import { SITE } from "@/lib/site";
import cast from "@/data/cast.json";

export const revalidate = 3600;

// Static pages and products change on deploys, not on a schedule; stamp them with server start.
const GENERATED = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE.url;
  const [like, aberrations, hidden] = await Promise.all([getDoc("like"), getDoc("aberrations"), hiddenPages()]);
  const statics = ["", "/about", "/faq", "/where", "/episodes", "/corrupted", "/cast", "/store", "/store-faq", "/store-terms", "/assets", "/supporter-wall", "/partner", "/privacy", "/fan-art", "/bingo", "/like", ...like.map((l) => `/like/${l.slug}`), "/aberrations", ...aberrations.map((a) => `/aberrations/${a.slug}`)].map((p) => ({
    url: `${base}${p}`,
    lastModified: GENERATED,
    changeFrequency: (p === "" || p === "/episodes" ? "weekly" : "monthly") as "weekly" | "monthly",
    priority: p === "" ? 1 : 0.7,
  }));
  const [items, products] = await Promise.all([getAllItems().catch(() => []), getProducts().catch(() => [])]);
  const all = [
    ...statics,
    ...items.map((e) => ({ url: `${base}/episodes/${e.slug}`, lastModified: e.date, changeFrequency: "yearly" as const, priority: 0.6 })),
    ...products.map((p) => ({ url: `${base}/store/${p.slug}`, lastModified: GENERATED, changeFrequency: "monthly" as const, priority: 0.5 })),
    ...cast.map((c) => ({ url: `${base}/cast/${c.slug}`, lastModified: GENERATED, changeFrequency: "monthly" as const, priority: 0.5 })),
  ];
  return all.filter((e) => !isHiddenPath(e.url.slice(base.length) || "/", hidden));
}
