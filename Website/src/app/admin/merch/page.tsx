import Link from "next/link";
import { getAllItems } from "@/lib/feed";
import { getProducts } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { saveEpisodeMerch } from "../actions";
import { Saved } from "../ui";

export const dynamic = "force-dynamic";

/** Tag an episode with related products; they appear as "Items based on this episode" under its content warnings. */
export default async function MerchAdmin({ searchParams }: { searchParams: Promise<{ saved?: string; e?: string }> }) {
  const { saved, e } = await searchParams;
  const [items, products, merch] = await Promise.all([
    getAllItems().catch(() => []),
    getProducts().catch(() => []),
    getDoc("episodeMerch").catch(() => ({}) as Record<string, string[]>),
  ]);
  const eps = items.filter((x) => x.kind === "episode" || x.kind === "postmortem" || x.kind === "minisode");
  const selected = e && eps.some((x) => x.slug === e) ? e : "";
  const checked = new Set(selected ? (merch[selected] ?? []) : []);
  const tagged = Object.entries(merch).filter(([slug]) => eps.some((x) => x.slug === slug));
  const title = (slug: string) => eps.find((x) => x.slug === slug)?.title ?? slug;
  const pname = (slug: string) => products.find((p) => p.slug === slug)?.name ?? slug;

  return (
    <div>
      <p className="eyebrow">Store</p>
      <h1 className="display text-5xl mt-2">Episode merch</h1>
      <p className="mt-3 max-w-prose text-paper/85">
        Tick the products an episode inspired and its page grows a merch strip under the content warnings. Untick everything to remove the strip. Saving is instant on the live site.
      </p>
      {saved && <Saved>Saved.</Saved>}

      {/* Pick an episode (link reloads with its boxes pre-ticked) */}
      <form className="mt-8" action="/admin/merch" method="get">
        <label className="block max-w-xl">
          <span className="eyebrow">Episode</span>
          <select name="e" defaultValue={selected} className="mt-1 w-full border border-line bg-ink-2 p-3 text-paper">
            <option value="">Pick an episode…</option>
            {eps.map((x) => (
              <option key={x.slug} value={x.slug}>
                {x.title}
                {merch[x.slug]?.length ? ` · ${merch[x.slug].length} tagged` : ""}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="btn mt-3 border border-line hover:border-yellow">
          Load
        </button>
      </form>

      {selected && (
        <form action={saveEpisodeMerch} className="mt-8 border border-line p-5">
          <input type="hidden" name="episode" value={selected} />
          <p className="font-semibold">{title(selected)}</p>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <li key={p.slug}>
                <label className="flex items-start gap-3 border border-line bg-ink-2/70 p-3 text-sm cursor-pointer">
                  <input type="checkbox" name="product" value={p.slug} defaultChecked={checked.has(p.slug)} className="mt-0.5 size-5 accent-yellow" />
                  <span>
                    <span className="font-semibold">{p.name}</span>
                    <span className="block text-xs text-muted">{p.slug}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <button type="submit" className="btn btn-yellow mt-5">
            Save
          </button>
        </form>
      )}

      {tagged.length > 0 && (
        <section className="mt-10">
          <h2 className="display text-2xl mb-2">Tagged episodes</h2>
          <ul className="divide-y divide-line border-y border-line">
            {tagged.map(([slug, list]) => (
              <li key={slug} className="py-2.5 flex items-center gap-3 text-sm">
                <Link href={`/admin/merch?e=${encodeURIComponent(slug)}`} className="min-w-0 flex-1 truncate hover:text-yellow">
                  {title(slug)}
                </Link>
                <span className="text-xs text-muted truncate max-w-[50%]">{list.map(pname).join(", ")}</span>
                <Link href={`/episodes/${slug}`} className="shrink-0 text-xs text-muted underline underline-offset-4 hover:text-yellow">
                  page
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
