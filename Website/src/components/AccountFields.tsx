"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { liveToken, useMember } from "@/lib/member";
import {
  notificationsOf,
  scGetUser,
  scPutAvatar,
  scPutUser,
  shrinkToDataUrl,
  type ScUser,
} from "@/lib/sc";

type Field = "displayName" | "email";

/**
 * The member's own details, in the site's own clothes.
 *
 * Supporting Cast's embed did this in a light-ground panel that could not be themed, so the
 * account page read as somebody else's product dropped into ours. These are the same three fields
 * their widget offers, written straight to the same endpoints — nothing is stored here, and their
 * response is what the page believes.
 *
 * Billing stays with them: plan changes carry proration, retention offers and tax, and rebuilding
 * that would be a lot of work at the one place where being wrong costs real money.
 */
export function AccountFields() {
  const member = useMember();
  const [user, setUser] = useState<ScUser | null>(null);
  const [editing, setEditing] = useState<Field | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const token = liveToken();
    if (!token) return;
    try {
      setUser(await scGetUser(token));
    } catch {
      setError("Could not load your details.");
    }
  }, []);

  useEffect(() => {
    if (member?.signedIn) void load();
  }, [member?.signedIn, load]);

  const start = (field: Field) => {
    setEditing(field);
    setDraft(user?.[field] ?? "");
    setError(null);
    setNote(null);
  };

  const save = useCallback(async () => {
    const token = liveToken();
    if (!token || !editing || busy) return;
    const value = draft.trim();
    if (!value) return setError("That cannot be blank.");
    if (editing === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return setError("That does not look like an email address.");
    }

    setBusy(true);
    setError(null);
    try {
      const updated = await scPutUser(token, { [editing]: value });
      // A message with no user in it means they refused the change.
      if (updated?.message && !updated.uuid) {
        setError(updated.message);
        return;
      }
      /*
       * Show what was saved, immediately.
       *
       * Two things made a successful write look like nothing happened: PUT does not always answer
       * with the whole user, and a re-read can come back describing the old value. Neither is
       * worth diagnosing from here — the write succeeded, so the saved value is the truth, and the
       * re-read is only allowed to fill in fields around it.
       */
      const saved = { [editing]: value } as Partial<ScUser>;
      setUser((u) => (u ? { ...u, ...saved } : u));
      setEditing(null);
      setNote(
        editing === "email"
          ? "Email updated. Your next sign-in link goes to the new address."
          : "Saved.",
      );
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }, [draft, editing, busy]);

  const upload = useCallback(async (file: File) => {
    const token = liveToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const dataUrl = await shrinkToDataUrl(file);
      const res = await scPutAvatar(token, dataUrl);
      if (!res.success || !res.url) {
        setError(res.message ?? "That image was not accepted.");
        return;
      }
      // Their response carries the stored url, so it is the value to show.
      const url = res.url;
      setUser((u) => (u ? { ...u, avatarUrl: url } : u));
      setNote("Avatar updated.");
    } catch {
      setError("Could not upload that image.");
    } finally {
      setBusy(false);
    }
  }, []);

  /**
   * Supporting Cast's own new-episode email.
   *
   * Only this one is offered. Their other switch covers posts, and members already get those from
   * us — showing both would be two controls for one outcome, and the one that wins would depend on
   * which page somebody happened to be looking at.
   *
   * Whatever `posts` is set to is passed straight back. This page has no opinion on it, and
   * quietly flipping a setting the member never saw is how trust in a preferences screen goes.
   */
  const toggleEpisodes = useCallback(async () => {
    const token = liveToken();
    if (!token || busy) return;
    const current = notificationsOf(user);
    const next = !current.newEpisodes;

    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const res = await scPutUser(token, {
        notifications: { ...current, newEpisodes: next },
      });
      if (res?.message && !res.uuid) {
        setError(res.message);
        return;
      }
      // Same rule as the fields: the write succeeded, so the box shows what was written. Their
      // GET reports an empty state as an array, which would read back as "off" and flip the box
      // under the person who just ticked it.
      const notifications = { ...current, newEpisodes: next };
      setUser((u) => (u ? { ...u, notifications } : u));
      setNote(next ? "You will hear about new episodes." : "Episode emails are off.");
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }, [user, busy]);

  if (!member?.signedIn || !user) return null;

  const notifications = notificationsOf(user);

  const row = (field: Field, label: string, value: string) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b border-line py-4">
      <p className="eyebrow">{label}</p>
      {editing === field ? (
        <span className="flex flex-1 flex-wrap items-center justify-end gap-2 min-w-0">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save();
              if (e.key === "Escape") setEditing(null);
            }}
            autoFocus
            type={field === "email" ? "email" : "text"}
            className="min-w-0 flex-1 border border-line bg-ink px-3 py-1.5 text-paper focus:border-yellow focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void save()}
            disabled={busy}
            className="border border-yellow px-3 py-1.5 text-sm text-yellow hover:bg-yellow hover:text-ink disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="text-sm text-muted hover:text-paper"
          >
            Cancel
          </button>
        </span>
      ) : (
        <span className="flex items-center gap-4 min-w-0">
          <span className="truncate">{value || <span className="text-muted">Not set</span>}</span>
          <button
            type="button"
            onClick={() => start(field)}
            className="shrink-0 text-sm text-yellow hover:underline underline-offset-4"
          >
            Change
          </button>
        </span>
      )}
    </div>
  );

  return (
    <section>
      <h2 className="eyebrow mb-1">Your details</h2>

      {row("displayName", "Display name", user.displayName)}
      {row("email", "Email", user.email)}

      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 border-b border-line py-4">
        <p className="eyebrow">Avatar</p>
        <span className="flex items-center gap-4">
          {user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- their host is not in the
            // image config, and next/image throws at runtime for a hostname it does not know.
            <img
              src={user.avatarUrl}
              alt=""
              width={44}
              height={44}
              className="size-11 border border-line object-cover"
            />
          ) : (
            <span className="grid size-11 place-items-center border border-line text-xs text-muted">
              None
            </span>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="text-sm text-yellow hover:underline underline-offset-4 disabled:opacity-40"
          >
            {busy ? "Working…" : "Change"}
          </button>
        </span>
      </div>

      <div className="border-b border-line py-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={!!notifications.newEpisodes}
            onChange={() => void toggleEpisodes()}
            disabled={busy}
            className="mt-1 size-4 accent-yellow"
          />
          <span>
            <span className="block">Email me when a new episode is out.</span>
            <span className="mt-1 block text-sm text-muted">
              Sent by Supporting Cast as the episode lands in your feed.
            </span>
          </span>
        </label>
      </div>

      {note && (
        <p role="status" className="mt-3 text-sm text-yellow">
          {note}
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-[#ff8a76]">
          {error}
        </p>
      )}
    </section>
  );
}
