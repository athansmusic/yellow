"use client";

import { useCallback, useEffect, useState } from "react";
import { liveToken, useMember } from "@/lib/member";

type Status = {
  available: boolean;
  linked: boolean;
  name?: string | null;
  url?: string | null;
  inviteUrl?: string | null;
};

/**
 * Linking a Discord account to a membership.
 *
 * Opt-in, and it stays that way: nothing happens until the member presses the button and approves
 * it on Discord's own screen. Supporting Cast has no Discord integration and no way to tell us
 * when a subscription lapses, so the role is granted at the moment membership is proven and taken
 * back when they unlink — which is what the copy says, rather than implying a sync that does not
 * exist.
 *
 * The whole section hides itself when the server has no Discord credentials, so a half-configured
 * integration is invisible instead of broken.
 */
export function DiscordLink() {
  const member = useMember();
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // Set when Discord says they are not in the server, which is answered with an invite rather
  // than an error — they have done nothing wrong and are one click from being able to retry.
  const [needsJoin, setNeedsJoin] = useState(false);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      const r = await fetch("/api/discord", { headers: { "x-sc-token": token } });
      setStatus((await r.json()) as Status);
    } catch {
      setStatus({ available: false, linked: false });
    }
  }, []);

  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

  // The callback route sends the member back here with the outcome in the URL.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("discord");
    if (!d) return;
    if (d === "linked") setNote("Discord linked — your role is on.");
    else if (d === "cancelled") setNote("Linking cancelled. Nothing changed.");
    else if (d === "join") {
      setNeedsJoin(true);
      setNote("Join the server first, then press the button again.");
    } else setNote(p.get("why") || "That did not work. Try again.");
    // Clears the query so a refresh does not replay the message.
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const unlink = useCallback(async () => {
    const token = liveToken();
    if (!token || busy) return;
    if (!confirm("Unlink Discord? Your members-only role will be removed.")) return;
    setBusy(true);
    try {
      await fetch("/api/discord", { method: "DELETE", headers: { "x-sc-token": token } });
      setNote("Discord unlinked.");
      await load();
    } catch {
      setNote("Could not unlink. Try again.");
    } finally {
      setBusy(false);
    }
  }, [busy, load]);

  if (!member?.signedIn || !status?.available) return null;

  return (
    <section className="mt-12 border-t border-line pt-8">
      <h2 className="eyebrow mb-3">Discord</h2>
      {status.linked ? (
        <div className="max-w-prose">
          <p>
            Linked as <span className="display">{status.name}</span>. Your members-only role is on.
          </p>
          <button
            type="button"
            onClick={unlink}
            disabled={busy}
            className="mt-3 border border-line px-3 py-1.5 text-sm text-muted hover:border-yellow hover:text-yellow disabled:opacity-40"
          >
            Unlink Discord
          </button>
        </div>
      ) : (
        <div className="max-w-prose">
          <p className="text-muted">
            Get the members-only role in the Hush server. You approve it on Discord, and you can
            unlink here at any time — the role comes off with it.
          </p>

          {needsJoin && status.inviteUrl && (
            <p className="mt-3">
              <a
                href={status.inviteUrl}
                target="_blank"
                rel="noreferrer"
                className="border border-line px-4 py-2 text-sm uppercase tracking-[0.14em] hover:border-yellow hover:text-yellow"
              >
                Join the server
              </a>
            </p>
          )}

          {status.url && (
            <a
              href={status.url}
              className="mt-3 inline-block border border-yellow px-4 py-2 text-sm uppercase tracking-[0.14em] text-yellow hover:bg-yellow hover:text-ink"
            >
              {needsJoin ? "Try again" : "Get Discord role"}
            </a>
          )}
        </div>
      )}
      {note && (
        <p role="status" className="mt-3 text-sm text-yellow">
          {note}
        </p>
      )}
    </section>
  );
}
