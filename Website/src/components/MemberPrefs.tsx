"use client";

import { useCallback, useEffect, useState } from "react";
import { liveToken, useMember } from "@/lib/member";

/**
 * What a member can choose to receive.
 *
 * Episode releases are deliberately not on this list: Supporting Cast already announces those to
 * the podcast app, and a second email saying the same thing is how a mailing list gets muted. The
 * copy says so, because an unexplained "email me about updates" reads as exactly that duplicate.
 *
 * The address is never sent from here. Curtain reads it from Supporting Cast when the box is
 * ticked, so this cannot be used to sign somebody else up.
 */
export function MemberPrefs() {
  const member = useMember();
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member?.signedIn) return;
    const token = liveToken();
    if (!token) return;
    let dead = false;
    fetch("/api/update-emails", { headers: { "x-sc-token": token } })
      .then((r) => r.json())
      .then((j: { subscribed?: boolean }) => {
        if (!dead) setSubscribed(!!j.subscribed);
      })
      .catch(() => !dead && setSubscribed(false));
    return () => {
      dead = true;
    };
  }, [member?.signedIn]);

  const toggle = useCallback(async () => {
    const token = liveToken();
    if (!token || busy) return;
    const next = !subscribed;
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/update-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-sc-token": token },
        body: JSON.stringify({ subscribed: next }),
      });
      const j = (await r.json()) as { subscribed?: boolean; error?: string };
      if (!r.ok) setError(j.error ?? "Could not save that.");
      else setSubscribed(!!j.subscribed);
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }, [subscribed, busy]);

  if (!member?.signedIn || subscribed === null) return null;

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="eyebrow mb-3">Email</h2>
      <label className="flex items-start gap-3 max-w-prose">
        <input
          type="checkbox"
          checked={subscribed}
          onChange={toggle}
          disabled={busy}
          className="mt-1 size-4 accent-yellow"
        />
        <span>
          <span className="block">Email me about updates — not episode releases.</span>
          <span className="mt-1 block text-sm text-muted">
            Occasional posts from the team: behind the scenes, extras, announcements. New episodes
            already reach you through your podcast app, so they are not included here. Unsubscribe
            from any email, or by unticking this.
          </span>
        </span>
      </label>
      {error && (
        <p role="alert" className="mt-3 text-sm text-yellow">
          {error}
        </p>
      )}
    </section>
  );
}
