"use client";

import { useRouter } from "next/navigation";

/** Phone-only subcategory picker: one native select under the category tabs. */
export function StoreSubSelect({ category, label, sub, options }: { category: string; label: string; sub?: string; options: { id: string; label: string; count: number }[] }) {
  const router = useRouter();
  return (
    <label className="sm:hidden block py-3">
      <span className="sr-only">Browse {label}</span>
      <select
        value={sub ?? ""}
        onChange={(e) => router.push(e.target.value ? `/store?c=${category}&t=${e.target.value}` : `/store?c=${category}`)}
        className="field !min-h-11 w-full"
      >
        <option value="">All {label}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label} ({o.count})
          </option>
        ))}
      </select>
    </label>
  );
}
