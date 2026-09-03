"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { liveToken, setMemberProfile, useMember } from "@/lib/member";
import { SubscriptionCard } from "@/components/SubscriptionCard";
import {
  notificationsOf,
  scGetUser,
  scPutAvatar,
  scPutUser,
  shrinkToDataUrl,
  type ScUser,
} from "@/lib/sc";

/**
 * The member's own details, in the site's own clothes.
 *
 * Supporting Cast's embed did this in a light-ground panel that could not be themed, so the
 * account page read as somebody else's product dropped into ours. These are the same fields their
 * widget offers, written straight to the same endpoints — nothing is stored here.
 *
 * Everything on this form saves in ONE request. Their API allows sixty calls a minute across the
 * whole page, the widget's own traffic included, and past that even the preflight fails — which
 * the browser reports as a CORS error, and which leaves the widget unable to fetch its config, so
 * it drops the member to a login screen. A form that saved per field spent that budget for
 * nothing.
 *
 * One button covers two systems. Everything except the updates list belongs to Supporting Cast;
 * that one is ours, on our own host and outside their rate limit. Which server a preference lives
 * on is our problem, not something to make somebody read a page to understand — so it is one form
 * with one Save.
 *
 * Billing stays with them: plan changes carry proration, retention offers and tax, and that is the
 * one screen where being wrong costs real money.
 */
export function AccountFields() {
  const member = useMember();
  const [user, setUser] = useState<ScUser | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [newEpisodes, setNewEpisodes] = useState(false);
  // Ours, not theirs. Loaded alongside so the form has one idea of what is currently set.
  const [updateEmails, setUpdateEmails] = useState(false);
  const [savedUpdateEmails, setSavedUpdateEmails] = useState(false);
  // Also ours: whether they want their name on the public supporter wall.
  const [listed, setListed] = useState(false);
  const [savedListed, setSavedListed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  /** Fill the form from whatever Supporting Cast currently holds. */
  const adopt = useCallback((u: ScUser) => {
    setUser(u);
    setDisplayName(u.displayName ?? "");
    setEmail(u.email ?? "");
    setNewEpisodes(!!notificationsOf(u).newEpisodes);
  }, []);

  useEffect(() => {
    if (!member?.signedIn) return;
    const token = liveToken();
    if (!token) return;
    let dead = false;

    void scGetUser(token)
      .then(({ ok, data }) => {
        if (dead) return;
        if (ok) adopt(data);
        else setError(data.message ?? "Could not load your details.");
      })
      .catch(() => {
        if (!dead) setError("Could not load your details.");
      });

    void fetch("/api/wall", { headers: { "x-sc-token": token } })
      .then((r) => r.json())
      .then((j: { listed?: boolean | null }) => {
        if (dead) return;
        setListed(!!j.listed);
        setSavedListed(!!j.listed);
      })
      .catch(() => {
        /* the box simply starts unticked */
      });

    void fetch("/api/update-emails", { headers: { "x-sc-token": token } })
      .then((r) => r.json())
      .then((j: { subscribed?: boolean }) => {
        if (dead) return;
        setUpdateEmails(!!j.subscribed);
        setSavedUpdateEmails(!!j.subscribed);
      })
      .catch(() => {
        /* the box simply starts unticked */
      });

    return () => {
      dead = true;
    };
  }, [member?.signedIn, adopt]);

  const current = useMemo(() => notificationsOf(user), [user]);

  const changed = useMemo(() => {
    if (!user) return false;
    return (
      displayName.trim() !== (user.displayName ?? "") ||
      email.trim() !== (user.email ?? "") ||
      newEpisodes !== !!current.newEpisodes ||
      updateEmails !== savedUpdateEmails ||
      listed !== savedListed
    );
  }, [
    user,
    displayName,
    email,
    newEpisodes,
    current.newEpisodes,
    updateEmails,
    savedUpdateEmails,
    listed,
    savedListed,
  ]);

  const save = useCallback(async () => {
    const token = liveToken();
    if (!token || !user || busy || !changed) return;

    const name = displayName.trim();
    const mail = email.trim();
    if (!name) return setError("A display name cannot be blank.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      return setError("That does not look like an email address.");
    }

    // Only what actually differs — a full object would overwrite fields this form never shows.
    const patch: Parameters<typeof scPutUser>[1] = {};
    if (name !== (user.displayName ?? "")) patch.displayName = name;
    if (mail !== (user.email ?? "")) patch.email = mail;
    if (newEpisodes !== !!current.newEpisodes) {
      // `posts` is passed straight back. This page has no opinion on it, and quietly flipping a
      // setting the member never saw is how trust in a preferences screen goes.
      patch.notifications = { ...current, newEpisodes };
    }

    setBusy(true);
    setError(null);
    setNote(null);
    try {
      // Ours first, and only if it changed. It is on our own host, so it costs nothing against
      // Supporting Cast's sixty-a-minute.
      if (updateEmails !== savedUpdateEmails) {
        const r = await fetch("/api/update-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sc-token": token },
          body: JSON.stringify({ subscribed: updateEmails }),
        });
        const j = (await r.json()) as { subscribed?: boolean; error?: string };
        if (!r.ok) {
          setError(j.error ?? "Could not save your email preference.");
          return;
        }
        setSavedUpdateEmails(!!j.subscribed);
        setUpdateEmails(!!j.subscribed);
      }

      if (listed !== savedListed) {
        const r = await fetch("/api/wall", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-sc-token": token },
          body: JSON.stringify({ listed }),
        });
        const j = (await r.json()) as { listed?: boolean; error?: string };
        if (!r.ok) {
          setError(j.error ?? "Could not save your supporter wall choice.");
          return;
        }
        setSavedListed(!!j.listed);
        setListed(!!j.listed);
      }

      // Nothing of theirs changed, so nothing of theirs is sent.
      if (Object.keys(patch).length === 0) {
        setNote("Saved.");
        return;
      }

      const { ok, data } = await scPutUser(token, patch);
      if (!ok) {
        setError(data.message ?? "Supporting Cast would not save that.");
        return;
      }
      /*
       * Show what was saved rather than whatever the reply happens to contain.
       *
       * Their PUT does not always answer with the whole user, and judging success by hunting for a
       * uuid in the body meant a write that had genuinely landed was read as a refusal — the field
       * kept showing its old value while reporting an error. The status says it worked, so the
       * values sent are the values shown.
       */
      setUser((u) =>
        u
          ? {
              ...u,
              ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
              ...(patch.email !== undefined ? { email: patch.email } : {}),
              ...(patch.notifications !== undefined ? { notifications: patch.notifications } : {}),
            }
          : u,
      );
      // The header and anywhere else showing a name read a per-tab cache, so a rename has to be
      // announced or it sits there stale until the tab is closed.
      if (patch.displayName !== undefined) setMemberProfile({ name: patch.displayName });

      setNote(
        patch.email !== undefined
          ? "Saved. Your next sign-in link goes to the new address."
          : "Saved.",
      );
    } catch {
      setError("Could not save that. Try again.");
    } finally {
      setBusy(false);
    }
  }, [
    busy,
    changed,
    current,
    displayName,
    email,
    newEpisodes,
    user,
    updateEmails,
    savedUpdateEmails,
    listed,
    savedListed,
  ]);

  /** The avatar is its own endpoint, so it cannot ride along with the rest. */
  const upload = useCallback(async (file: File) => {
    const token = liveToken();
    if (!token) return;
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      const dataUrl = await shrinkToDataUrl(file);
      const { ok, data } = await scPutAvatar(token, dataUrl);
      if (!ok || !data.url) {
        setError(data.message ?? "That image was not accepted.");
        return;
      }
      const url = data.url;
      setUser((u) => (u ? { ...u, avatarUrl: url } : u));
      setMemberProfile({ avatar: url });
      setNote("Avatar updated.");
    } catch {
      setError("Could not upload that image.");
    } finally {
      setBusy(false);
    }
  }, []);

  if (!member?.signedIn || !user) return null;

  const field =
    "w-full border border-line/80 bg-ink px-3 py-2.5 text-[15px] text-paper transition-colors focus:border-yellow focus:outline-none";
  /** A preference reads as one target, not a checkbox with words next to it. */
  const toggleRow = "flex w-full items-start gap-3.5 border border-line p-3.5 text-left transition-colors hover:border-yellow/60";

  return (
    <>
      {/* Membership first: it is what somebody opens this page to check. */}
      <SubscriptionCard user={user} />

      <section id="details" className="mt-10">
        <div className="border border-line">
          <div className="border-b border-line px-5 py-3">
            <p className="eyebrow">Your details</p>
          </div>

          <div className="grid gap-6 p-5">
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="grid gap-1.5">
                <span className="eyebrow">Display name</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={field}
                />
                <span className="text-sm text-muted">Shown on your comments.</span>
              </label>

              <label className="grid gap-1.5">
                <span className="eyebrow">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                />
                <span className="text-sm text-muted">Where your sign-in link is sent.</span>
              </label>
            </div>

            <div className="grid gap-2.5">
              <span className="eyebrow">Emails</span>

              <label className={toggleRow}>
                <input
                  type="checkbox"
                  checked={newEpisodes}
                  onChange={(e) => setNewEpisodes(e.target.checked)}
                  className="mt-0.5 size-4 accent-yellow"
                />
                <span>
                  <span className="block text-[15px]">Email me when a new episode is out.</span>
                  <span className="mt-1 block text-sm text-muted">
                    Sent by Supporting Cast as the episode lands in your feed.
                  </span>
                </span>
              </label>

              <label className={toggleRow}>
                <input
                  type="checkbox"
                  checked={updateEmails}
                  onChange={(e) => setUpdateEmails(e.target.checked)}
                  className="mt-0.5 size-4 accent-yellow"
                />
                <span>
                  <span className="block text-[15px]">Email me when updates are posted.</span>
                  <span className="mt-1 block text-sm text-muted">
                    Behind the scenes, extras and announcements from the team.
                  </span>
                </span>
              </label>
            </div>

            <div className="grid gap-2.5">
              <span className="eyebrow">Supporter wall</span>

              <label className={toggleRow}>
                <input
                  type="checkbox"
                  checked={listed}
                  onChange={(e) => setListed(e.target.checked)}
                  className="mt-0.5 size-4 accent-yellow"
                />
                <span>
                  <span className="block text-[15px]">List my name on the supporter wall.</span>
                  <span className="mt-1 block text-sm text-muted">
                    Your display name, shown publicly beside the other supporters. Off unless you
                    ask for it, and untick to be removed.
                  </span>
                </span>
              </label>
            </div>

            <div className="grid gap-2.5">
              <span className="eyebrow">Avatar</span>
              <div className="flex flex-wrap items-center gap-4">
                {user.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- their host is not in the
                  // image config, and next/image throws at runtime for a hostname it does not know.
                  <img
                    src={user.avatarUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="size-12 border border-line object-cover"
                  />
                ) : (
                  <span className="grid size-12 place-items-center border border-line text-xs text-muted">
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
                  className="border border-line px-4 py-2 text-[11px] uppercase tracking-[0.16em] text-muted transition-colors hover:border-yellow hover:text-yellow disabled:opacity-40"
                >
                  {busy ? "Working…" : "Change picture"}
                </button>
                <span className="text-sm text-muted">Square JPG or PNG, at least 200px.</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 border-t border-line pt-5">
              <button
                type="button"
                onClick={() => void save()}
                disabled={busy || !changed}
                className="border border-yellow px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-yellow transition-colors hover:bg-yellow hover:text-ink disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-yellow"
              >
                {busy ? "Saving…" : "Save changes"}
              </button>
              {changed && !busy && (
                <button
                  type="button"
                  onClick={() => {
                    adopt(user);
                    setError(null);
                    setNote(null);
                  }}
                  className="text-sm text-muted hover:text-paper"
                >
                  Discard
                </button>
              )}
              {changed && !busy && <span className="text-sm text-muted">Unsaved changes.</span>}

              {/* Ends the session on this device. Their widget reads the same key, so clearing it
                  signs the member out of the embed as well as out of ours. */}
              <button
                type="button"
                onClick={() => {
                  try {
                    localStorage.removeItem("sc_widget_token");
                    sessionStorage.clear();
                  } catch {}
                  window.location.href = "/";
                }}
                className="ml-auto text-sm text-muted hover:text-[#ff8f6b]"
              >
                Sign out
              </button>
            </div>

            {note && (
              <p role="status" className="text-sm text-yellow">
                {note}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-[#ff8f6b]">
                {error}
              </p>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
