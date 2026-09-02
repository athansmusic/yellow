"use client";

import { useEffect, useState } from "react";

/**
 * Whether this browser holds a live Supporting Cast session, and who it belongs to.
 *
 * The embed writes sc_widget_token to localStorage on the origin the login link landed on. That
 * origin is decided by the `redirect_url` their widget sends with auth/request, which it reads from
 * `data-redirect-url` on the mount — see ScWidget. Point it anywhere but here and the token is
 * written to a different origin, where nothing on this site can ever read it.
 *
 * The token is not opaque: it is base64(json)|signature, and the json carries `d` (issued) and `e`
 * (expires). Observed lifetime is 7 days, so presence alone is not enough — an expired token would
 * keep someone looking signed in while their entitled audio quietly stopped resolving.
 */
const TOKEN_KEY = "sc_widget_token";
const NAME_KEY = "tru-member-name";
/** Field names seen on a real /user response, for ?debug=member. Names only, never values. */
const SHAPE_KEY = "tru-member-shape";
/**
 * Fired when the name changes somewhere on this page.
 *
 * The browser's own `storage` event only reaches OTHER tabs, so renaming yourself on the account
 * page left the header showing the old name until the tab was closed — the cache below is read
 * without a round trip, by design, and nothing was telling it the cache was now wrong.
 */
const CHANGED = "tru-member-changed";
const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

type Payload = { u?: string; e?: number };

function payloadOf(token: string): Payload | null {
  try {
    const b64 = token.split("|")[0];
    return JSON.parse(atob(b64.replace(/-/g, "+").replace(/_/g, "/"))) as Payload;
  } catch {
    return null;
  }
}

/** The token, but only while it is still valid. */
export function liveToken(): string | null {
  let token: string | null = null;
  try {
    token = localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
  if (!token) return null;
  const p = payloadOf(token);
  // A token we cannot read is still worth trying: Supporting Cast is the real authority, and the
  // worst case is their API declines it and the public audio plays.
  if (p?.e && p.e * 1000 < Date.now()) return null;
  return token;
}

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * Pull a human name out of their user object.
 *
 * Their bundle gave no single answer: the checkout form reads `firstname`/`lastname`, while
 * `display_name` in that code belongs to tax rates, not people. Rather than guess one field and
 * ship a badge that silently says "Account" forever, try every plausible shape and record which
 * keys actually came back so ?debug=member can settle it from one real response.
 */
function nameFrom(raw: Record<string, unknown>): string | null {
  const u = (raw.user ?? raw.data ?? raw) as Record<string, unknown>;
  const direct =
    str(u.display_name) ?? str(u.displayName) ?? str(u.name) ?? str(u.full_name) ?? str(u.fullName);
  if (direct) return direct;

  const first = str(u.first_name) ?? str(u.firstName) ?? str(u.firstname);
  const last = str(u.last_name) ?? str(u.lastName) ?? str(u.lastname);
  if (first) return last ? `${first} ${last.slice(0, 1).toUpperCase()}.` : first;

  // Last resort: the local part of their email beats a generic label, and they already know it.
  const email = str(u.email);
  return email ? email.split("@")[0] : null;
}

/**
 * Record a new display name and tell every badge on the page about it.
 *
 * Called after the account form saves a rename. The name is already known, so this updates the
 * cache directly rather than spending one of Supporting Cast's sixty-a-minute re-reading it.
 */
export function setMemberName(name: string | null) {
  try {
    if (name) sessionStorage.setItem(NAME_KEY, name);
    else sessionStorage.removeItem(NAME_KEY);
  } catch {}
  try {
    window.dispatchEvent(new Event(CHANGED));
  } catch {}
}

export type MemberState = { signedIn: boolean; name: string | null };

/**
 * Signed-in state for the header. Returns undefined until known, so the badge renders nothing
 * rather than flashing the signed-out state — and, more importantly, so the server and the first
 * client render agree. Deciding this during render instead would be a hydration mismatch, which on
 * this site has previously killed every event handler on every page at once.
 */
export function useMember(): MemberState | undefined {
  const [state, setState] = useState<MemberState | undefined>(undefined);

  useEffect(() => {
    let dead = false;

    const read = () => {
      const token = liveToken();
      if (!token) {
        setState({ signedIn: false, name: null });
        return;
      }

      // Names change rarely; remember it for the tab so every page load is not a round trip.
      let cached: string | null = null;
      try {
        cached = sessionStorage.getItem(NAME_KEY);
      } catch {}
      setState({ signedIn: true, name: cached });
      if (cached) return;

      fetch("https://widget-api.supportingcast.fm/user", {
        headers: {
          "Supportingcast-Widget-Publishable-Key": PK,
          "Supportingcast-Widget-Access-Token": token,
          "Content-Type": "application/json",
        },
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((j: Record<string, unknown> | null) => {
          if (dead || !j) return;
          try {
            const u = (j.user ?? j.data ?? j) as Record<string, unknown>;
            sessionStorage.setItem(SHAPE_KEY, Object.keys(u).join(", "));
          } catch {}
          const name = nameFrom(j);
          if (!name) return;
          try {
            sessionStorage.setItem(NAME_KEY, name);
          } catch {}
          setState({ signedIn: true, name });
        })
        .catch(() => {
          /* signed in but nameless: the badge falls back to a generic label */
        });
    };

    read();

    // Signing in or out happens in the widget, which may be on another tab or another route. The
    // storage event only fires in OTHER tabs, so it alone would miss the ordinary mobile flow:
    // leave for the mail app, follow the magic link, come back to this tab. focus, visibilitychange
    // and pageshow (which covers a back/forward-cache restore, where no effect re-runs) close that.
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) {
        try {
          sessionStorage.removeItem(NAME_KEY);
        } catch {}
        read();
      }
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") read();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", read);
    window.addEventListener("pageshow", read);
    window.addEventListener(CHANGED, read);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      dead = true;
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", read);
      window.removeEventListener("pageshow", read);
      window.removeEventListener(CHANGED, read);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return state;
}

/** Field names from the last /user response, for the account page's debug readout. */
export function memberShape(): string | null {
  try {
    return sessionStorage.getItem(SHAPE_KEY);
  } catch {
    return null;
  }
}
