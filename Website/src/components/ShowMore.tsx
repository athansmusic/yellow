"use client";

import { useState, type ReactNode } from "react";

/**
 * Renders every child in the HTML (crawlable, lazy images) but shows only the first 24 until the
 * visitor asks for the rest. Filters and sort stay in the URL; no pagination round trips.
 * The 24 lives in globals.css (`[data-collapsed] > :nth-child(n + 25)`).
 */
export const SHOW_INITIAL = 24;

export function ShowMore({ total, label = "items", children }: { total: number; label?: string; children: ReactNode }) {
  const [all, setAll] = useState(false);
  const collapsed = !all && total > SHOW_INITIAL;
  return (
    <>
      <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 xl:grid-cols-4" data-collapsed={collapsed ? "" : undefined}>
        {children}
      </div>
      {collapsed && (
        <div className="mt-8 flex flex-col items-center gap-2">
          <p className="text-xs text-muted tabular">
            Showing {SHOW_INITIAL} of {total} {label}
          </p>
          <button type="button" onClick={() => setAll(true)} className="btn btn-ghost">
            Show all {total}
          </button>
        </div>
      )}
    </>
  );
}
