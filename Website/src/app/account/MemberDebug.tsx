"use client";

import { useEffect, useState } from "react";
import { liveToken, memberShape, useMember } from "@/lib/member";

/**
 * ?debug=member answers the two questions that are invisible from the outside: did the login leave
 * a token on THIS origin, and what does Supporting Cast actually call the member's name.
 *
 * The second one is why this exists. Their bundle uses `firstname`/`lastname` in the checkout form
 * while `display_name` belongs to tax rates, so the badge's field name cannot be settled by reading
 * their code — only by looking at one real response. This prints the key names, never the values.
 */
export function MemberDebug() {
  const member = useMember();
  const [rows, setRows] = useState<string[] | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("debug") !== "member") return;

    const out: string[] = [`origin: ${window.location.origin}`];
    let raw: string | null = null;
    try {
      raw = localStorage.getItem("sc_widget_token");
    } catch {
      out.push("localStorage: blocked");
    }
    out.push(`sc_widget_token: ${raw ? `present (${raw.length} chars)` : "ABSENT on this origin"}`);
    out.push(`live (unexpired): ${liveToken() ? "yes" : "no"}`);

    if (raw) {
      try {
        const p = JSON.parse(atob(raw.split("|")[0])) as { e?: number };
        const hrs = p.e ? Math.round((p.e * 1000 - Date.now()) / 36e5) : null;
        out.push(`expires in: ${hrs === null ? "unknown" : `${hrs}h`}`);
      } catch {
        out.push("token did not decode");
      }
    }
    // Why the store discount is or is not applying. The three causes of "no discount" look
    // identical on the shop page; this is where someone goes to find out which one it is.
    if (raw) {
      fetch("/api/member-discount", { headers: { "x-sc-token": raw } })
        .then((r) => r.json())
        .then((j: { percentOff?: number; reason?: string }) =>
          setRows((prev) => [...(prev ?? []), `store discount: ${j.percentOff ?? 0}% (${j.reason ?? "?"})`]),
        )
        .catch(() => {});
    }

    setRows(out);
  }, []);

  if (!rows) return null;

  const all = [
    ...rows,
    `resolved name: ${member === undefined ? "(loading)" : (member.name ?? "none — badge shows Account")}`,
    `/user fields: ${memberShape() ?? "(not fetched yet — reload once)"}`,
  ];

  return (
    <pre className="mb-6 overflow-x-auto border border-yellow bg-ink p-4 font-mono text-xs text-paper">
      {all.join("\n")}
    </pre>
  );
}
