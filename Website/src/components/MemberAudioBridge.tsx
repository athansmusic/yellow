"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";
import { liveToken } from "@/lib/member";
import { privateGuidFor } from "@/lib/private-episodes";

declare global {
  interface Window {
    ScPlayer?: { init: (el: Element, opts?: { authToken?: string }) => void };
  }
}

const SC_PLAYER_JS = "https://media.supportingcast.fm/js/sc-player.js";
/** The members' feed on Supporting Cast. An identifier, not a secret. */
const SC_FEED_UUID = "0a8a7bce-e475-4497-9e86-0b86f9b9cea0";

/** "/episodes/s1e27" -> "s1e27". Tracks carry their page href; that is the only key we need. */
function slugOf(href?: string): string | null {
  const m = /^\/episodes\/([^/?#]+)/.exec(href ?? "");
  return m ? m[1] : null;
}

/**
 * Ad-free audio for a signed-in member, wherever the episode was played from.
 *
 * This used to live on the episode page, which meant it only applied to episodes played FROM that
 * page: pressing play on the home page or in the episodes list served the public, ad-stitched cut
 * to members who were paying not to hear it. Playback is a property of the player, not of a route,
 * so this follows the current track instead and sits with the bar in the layout.
 *
 * Supporting Cast's sc-player builds a real <audio>, resolves the entitled source through
 * player-api.supportingcast.fm and enforces access there. We mount it out of sight, wait for it,
 * and hand that element to the bar. Every control stays ours; the URL, the entitlement check and
 * the play accounting stay theirs. Anything that fails leaves the public audio playing.
 */
export function MemberAudioBridge() {
  const { track, adoptAudio } = usePlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const mountedFor = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Visible in the DOM so a failure can be diagnosed on a phone, where there is no console.
  const [state, setState] = useState<"idle" | "mounting" | "adopted">("idle");

  // Signing in happens elsewhere — another tab, or the magic link opening /account and the listener
  // coming back. pageshow covers a back/forward-cache restore, where no effect re-runs at all.
  useEffect(() => {
    const check = () => setToken((prev) => prev ?? liveToken());
    check();
    const onStorage = (e: StorageEvent) => e.key === "sc_widget_token" && check();
    const onVisible = () => document.visibilityState === "visible" && check();
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", check);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", check);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const mount = useCallback(
    (guid: string, trackId: string, auth: string) => {
      const host = hostRef.current;
      if (!host) return;
      host.replaceChildren();
      setState("mounting");

      const el = document.createElement("div");
      el.className = "sc-player";
      // The private feed's RSS guid resolves on its own; the response even returns the feed uuid.
      // Sending both is belt and braces.
      el.setAttribute("data-episode-guid", guid);
      el.setAttribute("data-feed-uuid", SC_FEED_UUID);
      el.setAttribute("data-autoinit", "false");
      el.setAttribute("data-auth-token", auth);
      el.setAttribute("data-show-description", "false");
      host.appendChild(el);

      let tries = 0;
      const poll = setInterval(() => {
        if (mountedFor.current !== trackId) {
          clearInterval(poll);
          return;
        }
        const audio = el.querySelector("audio");
        if (audio) {
          clearInterval(poll);
          adoptAudio(audio, trackId);
          setState("adopted");
        } else if (++tries > 40) {
          clearInterval(poll);
        }
      }, 250);

      const start = () => {
        try {
          window.ScPlayer?.init(el, { authToken: auth });
        } catch {
          clearInterval(poll);
        }
      };

      const existing = document.querySelector<HTMLScriptElement>(`script[src*="sc-player"]`);
      if (existing && window.ScPlayer) {
        start();
        return;
      }
      existing?.remove();
      const s = document.createElement("script");
      // NOT type="module", despite their docs. The bundle is a plain IIFE that sets window.ScPlayer,
      // and their CDN sends no Access-Control-Allow-Origin — a module script is always fetched in
      // CORS mode, so it could never load cross-origin.
      s.src = SC_PLAYER_JS;
      s.onload = start;
      s.onerror = () => clearInterval(poll);
      document.body.appendChild(s);
    },
    [adoptAudio],
  );

  useEffect(() => {
    if (!token || !track) return;

    // Always by slug. A track id cannot stand in: public and members' guids are both 24 hex
    // characters, so a fallback on shape would happily hand Supporting Cast the public id.
    const slug = slugOf(track.href);
    const guid = slug ? privateGuidFor(slug) : null;

    if (!guid) {
      // Nothing entitled for this track — hand playback back to our own element.
      if (mountedFor.current) {
        mountedFor.current = null;
        hostRef.current?.replaceChildren();
        adoptAudio(null);
        setState("idle");
      }
      return;
    }
    if (mountedFor.current === track.id) return;

    mountedFor.current = track.id;
    mount(guid, track.id, token);
  }, [track, token, mount, adoptAudio]);

  // Never seen: it is the audio source, not the interface. Kept in the layout rather than
  // display:none, since a detached or undisplayed player may not initialise at all.
  return (
    <div
      ref={hostRef}
      aria-hidden
      data-member-audio={state}
      className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -left-[9999px]"
    />
  );
}
