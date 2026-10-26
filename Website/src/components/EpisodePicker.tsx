"use client";

import { useRouter } from "next/navigation";

/** Native dropdown for choosing an episode on small screens; navigates to the same page with ?ep= set. */
export function EpisodePicker({ options, value, className = "" }: { options: { slug: string; label: string }[]; value: string; className?: string }) {
  const router = useRouter();
  return (
    <label className={`grid gap-1 ${className}`}>
      <span className="eyebrow">Choose an episode</span>
      <select value={value} onChange={(e) => router.replace(`/where?tab=episodes&ep=${e.target.value}`, { scroll: false })} className="field">
        {options.map((o) => (
          <option key={o.slug} value={o.slug}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
