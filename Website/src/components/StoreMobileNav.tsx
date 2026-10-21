"use client";

import { useRouter } from "next/navigation";
import { TAXONOMY, COLLECTIONS } from "@/lib/storeTaxonomy";

type Counts = Record<string, number>;

/**
 * Phone-only store navigation: one native select with every category and subcategory (and collections),
 * replacing the scrolling tab strip. Desktop keeps StoreNav.
 */
export function StoreMobileNav({ counts, value, collectionCounts }: { counts: Counts; value: string; collectionCounts: Record<string, number> }) {
  const router = useRouter();
  return (
    <label className="sm:hidden block pb-4">
      <span className="eyebrow block mb-1">Browse</span>
      <select value={value} onChange={(e) => router.push(e.target.value)} className="field !min-h-12 w-full display text-xl">
        <option value="/store">Everything ({counts.all ?? 0})</option>
        {TAXONOMY.map((cat) => (
          <optgroup key={cat.id} label={cat.label}>
            <option value={`/store?c=${cat.id}`}>
              All {cat.label} ({counts[cat.id] ?? 0})
            </option>
            {cat.subs
              .filter((s) => (counts[`${cat.id}/${s.id}`] ?? 0) > 0)
              .map((s) => (
                <option key={s.id} value={`/store?c=${cat.id}&t=${s.id}`}>
                  {s.label} ({counts[`${cat.id}/${s.id}`]})
                </option>
              ))}
          </optgroup>
        ))}
        <optgroup label="Collections">
          {COLLECTIONS.filter((c) => (collectionCounts[c.id] ?? 0) > 1).map((c) => (
            <option key={c.id} value={`/store?col=${c.id}`}>
              {c.label} ({collectionCounts[c.id]})
            </option>
          ))}
        </optgroup>
      </select>
    </label>
  );
}
