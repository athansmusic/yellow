import Image from "next/image";
import { getProducts, money } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { saveFeatured } from "../actions";

export default async function FeaturedAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const [products, featured] = await Promise.all([getProducts().catch(() => []), getDoc("featured")]);
  const pos = (slug: string) => featured.slugs.indexOf(slug);

  return (
    <div>
      <p className="eyebrow">Home page</p>
      <h1 className="display text-5xl mt-2">Featured products</h1>
      <p className="mt-3 max-w-prose text-paper/85">Tick up to four and give each a number for its order. The home page shows them in that order; with nothing ticked it shows the first four in the catalog.</p>
      {saved && (
        <p role="status" className="mt-4 border border-yellow/60 bg-yellow/10 p-3 text-sm">
          Saved. The home page updates within a minute.
        </p>
      )}
      <form action={saveFeatured} className="mt-8">
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-ink/95 backdrop-blur border-b border-line flex items-center gap-4">
          <button type="submit" className="btn btn-yellow">
            Save
          </button>
          <span className="text-sm text-muted">{featured.slugs.length} picked</span>
        </div>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => {
            const i = pos(p.slug);
            return (
              <li key={p.slug} className={`flex items-center gap-3 border p-2 ${i >= 0 ? "border-yellow bg-yellow/5" : "border-line bg-ink-2/70"}`}>
                <input type="checkbox" name="slug" value={p.slug} defaultChecked={i >= 0} aria-label={`Feature ${p.name}`} className="size-5 accent-yellow" />
                <Image src={p.image} alt="" width={56} height={56} className="size-14 object-cover bg-[#f3f3f3]" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">{p.name}</span>
                  <span className="block text-xs text-muted">{money(p.priceCents)}</span>
                </span>
                <input type="number" name={`order:${p.slug}`} min={1} max={4} defaultValue={i >= 0 ? i + 1 : ""} placeholder="#" aria-label={`Order for ${p.name}`} className="field !w-16 !min-h-9 text-center" />
              </li>
            );
          })}
        </ul>
      </form>
    </div>
  );
}
