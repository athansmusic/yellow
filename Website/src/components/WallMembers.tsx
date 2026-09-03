"use client";

import { useEffect, useState } from "react";

/**
 * Members who asked to be listed on the wall.
 *
 * The list is public — that is what a wall is for. Membership is not: only people who opted in
 * appear, so nobody is named here who did not ask to be. Supporting Cast exposes no member list at
 * all, but even if it did, a Kickstarter backer chose a public credit as part of a reward and a
 * subscriber did not.
 *
 * Read-only. Opting in and out lives on the account page with every other preference, so there is
 * one place to change it and no chance of two controls disagreeing about what is set.
 */
export function WallMembers() {
  const [names, setNames] = useState<string[] | null>(null);

  useEffect(() => {
    let dead = false;
    void fetch("/api/wall")
      .then((r) => r.json())
      .then((j: { members?: string[] }) => {
        if (!dead) setNames(j.members ?? []);
      })
      .catch(() => {
        if (!dead) setNames([]);
      });
    return () => {
      dead = true;
    };
  }, []);

  if (names === null) return <p className="text-muted text-sm">Loading…</p>;
  if (names.length === 0) return null;

  return (
    <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
      {names.map((n) => (
        <li key={n} className="text-paper/85">
          {n}
        </li>
      ))}
    </ul>
  );
}
