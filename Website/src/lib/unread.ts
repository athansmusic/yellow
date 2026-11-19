"use client";

import { useEffect, useState } from "react";
import { liveToken } from "@/lib/member";

/**
 * How many replies are waiting for this member.
 *
 * Cached for a couple of minutes in sessionStorage, because this runs in the header and would
 * otherwise be a request on every page view for a number that changes rarely. The cache is per
 * tab and dies with it.
 *
 * Refreshes when the tab regains focus, which is when someone is most likely to have been replied
 * to since they last looked, and clears itself when /account marks everything read.
 */
const KEY = "tru-unread-replies";
const TTL_MS = 2 * 60 * 1000;

type Cached = { count: number; at: number };

function read(): Cached | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Cached;
    return Date.now() - c.at < TTL_MS ? c : null;
  } catch {
    return null;
  }
}

export function useUnread(signedIn: boolean | undefined): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!signedIn) return;
    let dead = false;

    const load = async (force = false) => {
      if (!force) {
        const cached = read();
        if (cached) {
          setCount(cached.count);
          return;
        }
      }
      const token = liveToken();
      if (!token) return;
      try {
        const r = await fetch("/api/comments/activity", { headers: { "x-sc-token": token } });
        const j = (await r.json()) as { unread?: number };
        if (dead) return;
        const n = j.unread ?? 0;
        setCount(n);
        try {
          sessionStorage.setItem(KEY, JSON.stringify({ count: n, at: Date.now() } satisfies Cached));
        } catch {}
      } catch {
        /* a bell that cannot count is simply not shown */
      }
    };

    void load();
    const onFocus = () => void load(true);
    window.addEventListener("focus", onFocus);
    return () => {
      dead = true;
      window.removeEventListener("focus", onFocus);
    };
  }, [signedIn]);

  return count;
}
