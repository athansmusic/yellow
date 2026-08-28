"use client";

import { useEffect, useState } from "react";

/**
 * Whether this browser holds a live Supporting Cast session, and who it belongs to.
 *
 * The embed writes sc_widget_token to localStorage on our domain when someone signs in. It is not
 * opaque: the value is base64(json)|signature, and the json carries `d` (issued) and `e` (expires).
 * Observed lifetime is exactly 7 days, so presence alone is not enough — an expired token would
 * keep someone looking signed in while their entitled audio quietly stopped resolving.
 */
const TOKEN_KEY = "sc_widget_token";
const NAME_KEY = "tru-member-name";
const PK =
  "wpk_I8kt6WweVJg8cAvL8AtzisBdsdlW9T7eH6zEY38R5ubOaIxrQa6yqYV7BOS24w5sSk5FKSgLbbsDTnq7tmv5lR3vELNcRUlCbvN";

type Payload = { u?: string; e?: number };

function payloadOf(token: string): Payload | null {
  try {
    const b64 = token.split("|")[0];
    const json = atob(b64.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json) as Payload;
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
  // worst case is their player declines it and the public audio plays.
  if (p?.e && p.e * 1000 < Date.now()) return null;
  return token;
}

/**
 * Signed-in state for the header. Returns undefined until known, so the badge can render nothing
 * rather than flashing the signed-out state on every page load.
 */
export function useMember(): { signedIn: boolean; name: string | null } | undefined {
  const [state, setState] = useState<{ signedIn: boolean; name: string | null } | undefined>(undefined);

  useEffect(() => {
    const token = liveToken();
    if (!token) {
      setState({ signedIn: false, name: null });
      return;
    }

    // Names change rarely; remember it for the tab so every page load is not a network round trip.
    let cached: string | null = null;
    try {
      cached = sessionStorage.getItem(NAME_KEY);
    } catch {}
    setState({ signedIn: true, name: cached });
    if (cached) return;

    let dead = false;
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
        const u = (j.user ?? j.data ?? j) as Record<string, unknown>;
        const name =
          [u.display_name, u.name, u.full_name, u.first_name]
            .find((v) => typeof v === "string" && v.trim().length > 0) as string | undefined;
        if (!name) return;
        try {
          sessionStorage.setItem(NAME_KEY, name);
        } catch {}
        setState({ signedIn: true, name });
      })
      .catch(() => {
        /* signed in but nameless: the badge falls back to a generic label */
      });

    return () => {
      dead = true;
    };
  }, []);

  return state;
}
