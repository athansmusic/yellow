import Image from "next/image";
import Link from "next/link";
import { getProductsBase } from "@/lib/catalog";
import { getDoc } from "@/lib/content";
import { saveStoreCopy } from "../actions";

export default async function StoreCopyAdmin({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  const { saved } = await searchParams;
  const [products, copy] = await Promise.all([getProductsBase().catch(() => []), getDoc("storeCopy")]);

  return (
    <div>
      <p className="eyebrow">Store</p>
      <h1 className="display text-5xl mt-2">Store copy</h1>
      <p className="mt-3 max-w-prose text-paper/85">
        Two to four sentences: what the art is, which episode or aberration it comes from, why a fan wants it. Then blank specs on separate lines starting with • (bullets render as a list).
      </p>
      {saved && (
        <p role="status" className="mt-4 border border-yellow/60 bg-yellow/10 p-3 text-sm">
          Saved. Product pages update within a minute.
        </p>
      )}
      <form action={saveStoreCopy} className="mt-8">
        <div className="sticky top-16 z-10 -mx-4 px-4 py-3 bg-ink/95 backdrop-blur border-b border-line flex items-center gap-4">
          <button type="submit" className="btn btn-yellow">
            Save
          </button>
          <span className="text-sm text-muted">{products.length} products</span>
        </div>
        <ul className="mt-4 grid gap-4">
          {products.map((p) => {
            const c = copy[p.slug];
            const placeholder = p.description.slice(0, 140);
            return (
              <li key={p.slug} className="border border-line bg-ink-2/70 p-4">
                <div className="flex items-center gap-3">
                  <Image src={p.image} alt="" width={48} height={48} className="size-12 object-cover bg-[#f3f3f3]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-xs text-muted">
                      {p.slug} ·{" "}
                      <Link href={`/store/${p.slug}`} target="_blank" className="underline hover:text-yellow">
                        View page
                      </Link>
                    </p>
                  </div>
                </div>
                <div className="mt-3 grid gap-3">
                  <label className="grid gap-1 text-sm">
                    <span className="eyebrow">Description</span>
                    <textarea name={`desc:${p.slug}`} defaultValue={c?.description ?? ""} rows={5} placeholder={placeholder} className="field" />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="grid gap-1 text-sm">
                      <span className="eyebrow">Artist</span>
                      <input name={`artist:${p.slug}`} defaultValue={c?.artist ?? ""} className="field" />
                    </label>
                    <label className="grid gap-1 text-sm">
                      <span className="eyebrow">Artist URL</span>
                      <input name={`artistUrl:${p.slug}`} defaultValue={c?.artistUrl ?? ""} placeholder="https://…" className="field" />
                    </label>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </form>
    </div>
  );
}
