import Image from "next/image";
import Link from "next/link";
import { money } from "@/lib/money";
import type { CardProduct } from "@/lib/catalog";
import { swatch } from "@/lib/swatches";

/** "$20.00" / "$28.00 to $45.50" */
export function priceRange(p: Pick<CardProduct, "priceCents" | "priceMaxCents">) {
  return p.priceCents === p.priceMaxCents ? money(p.priceCents) : `${money(p.priceCents)} to ${money(p.priceMaxCents)}`;
}

export function ProductCard({ p, priority = false }: { p: CardProduct; priority?: boolean }) {
  const hover = p.images.find((i) => i && i !== p.image);
  const colors = p.colors.filter((c) => c && !/glossy|matte/i.test(c));
  return (
    <article className="group relative flex flex-col bg-ink-2 border border-line hover:border-yellow transition-colors">
      <div className="p-2 sm:p-2.5">
        <div className="relative aspect-square overflow-hidden bg-[#f3f3f3] border border-line/60">
          <Image src={p.image} alt="" fill sizes="(min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw" className="object-cover" priority={priority} />
          {hover && <Image src={hover} alt="" fill sizes="(min-width:1280px) 20vw, (min-width:768px) 33vw, 50vw" className="object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-200" />}
          {p.isNew && <span className="absolute left-2 top-2 bg-yellow text-ink display text-sm leading-none px-2 py-1">New</span>}
        </div>
      </div>
      <div className="px-3 pb-3 sm:px-4 sm:pb-4 flex flex-col gap-1 flex-1">
        <h3 className="display text-xl sm:text-2xl leading-[1] line-clamp-2">
          <Link href={`/store/${p.slug}`} className="hover:text-yellow after:absolute after:inset-0">
            {p.name}
          </Link>
        </h3>
        {p.artist && <p className="text-[11px] uppercase tracking-wider text-muted">Art by {p.artist}</p>}
        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
          <p className="text-sm text-paper/90 tabular">{priceRange(p)}</p>
          {colors.length > 1 && (
            <ul className="flex items-center gap-1" aria-label={`${colors.length} colours`}>
              {colors.slice(0, 6).map((c) => (
                <li key={c} title={c} className="size-3 rounded-full border border-paper/30" style={{ background: swatch(c) }} />
              ))}
              {colors.length > 6 && <li className="text-[10px] text-muted tabular">+{colors.length - 6}</li>}
            </ul>
          )}
        </div>
      </div>
    </article>
  );
}
