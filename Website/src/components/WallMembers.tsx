"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { liveToken, useMember } from "@/lib/member";

/**
 * Members who asked to be listed on the wall.
 *
 * The list is public — that is what a wall is for. Membership is not: only people who opted in
 * appear, so nobody is named here who did not ask to be. Supporting Cast exposes no member list at
 * all, but even if it did, a Kickstarter backer chose a public credit as part of a reward and a
 * subscriber did not.
 */
export function WallMembers() {
  const member = useMember();
  const [names, setNames] = useState<string[] | null>(null);
  const [listed, setListed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const token = liveToken();
    try {
      const r = await fetch("/api/wall", { headers: token ? { "x-sc-token": token } : {} });
      const j = (await r.json()) as { members?: string[]; listed?: boolean | null };
      setNames(j.members ?? []);
      setListed(j.listed ?? null);
    } catch {
      setNames([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load, member?.signedIn]);

  const toggle = useCallback(async () => {
    const token = liveToken();
    if (!token || busy) return;
    setBusy(true);
    const next = !listed;
    try {
      const r = await fetch("/api/wall", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sc-token": token },
        body: JSON.stringify({ listed: next }),
      });
      if (r.ok) {
        setListed(next);
        await load();
      }
    } catch {
      /* leave the toggle where it was */
    } finally {
      setBusy(false);
    }
  }, [listed, busy, load]);

  if (names === null) return <p className="text-muted text-sm">Loading…</p>;

  return (
    <div>
      {names.length === 0 ? (
        <p className="text-muted max-w-prose">
          No one is listed yet. Members can add themselves from their account page.
        </p>
      ) : (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {names.map((n) => (
            <li key={n} className="text-paper/85">
              {n}
            </li>
          ))}
        </ul>
      )}

      {member?.signedIn && (
        <div className="mt-8 border-t border-line pt-5">
          <button
            type="button"
            onClick={toggle}
            disabled={busy}
            className={`inline-flex items-center gap-2 display text-lg px-4 py-2 border transition-colors disabled:opacity-40 ${
              listed
                ? "border-line text-paper hover:border-yellow hover:text-yellow"
                : "border-yellow bg-yellow text-ink hover:bg-transparent hover:text-yellow"
            }`}
          >
            {busy ? "Saving…" : listed ? "Take me off the wall" : "Add me to the wall"}
          </button>
          <p className="mt-2 text-xs text-muted max-w-prose">
            {listed
              ? "You are listed under the name on your Supporting Cast account. Taking yourself off removes the entry entirely."
              : "Adds your Supporting Cast display name to the list above. Nobody is listed without asking, and you can remove yourself at any time."}
          </p>
        </div>
      )}

      {member !== undefined && !member.signedIn && (
        <p className="mt-8 border-t border-line pt-5 text-muted max-w-prose">
          Members can add their name here.{" "}
          <Link href="/join" className="text-yellow hover:underline underline-offset-4">
            Join the Unit
          </Link>{" "}
          or{" "}
          <Link href="/login" className="text-yellow hover:underline underline-offset-4">
            sign in
          </Link>
          .
        </p>
      )}
    </div>
  );
}
