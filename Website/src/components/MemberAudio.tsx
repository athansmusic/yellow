"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";
import { liveToken } from "@/lib/member";

declare global {
  interface Window {
    ScPlayer?: { init: (el: Element, opts?: { authToken?: string }) => void };
  }
}

const SC_PLAYER_JS = "https://media.supportingcast.fm/js/sc-player.js";
/** The members' feed on Supporting Cast. An identifier, not a secret. */
const SC_FEED_UUID = "0a8a7bce-e475-4497-9e86-0b86f9b9cea0";

/**
 * Plays the member's ad-free audio through OUR player, without going around Supporting Cast.
 *
 * Their sc-player builds a real <audio> element, resolves the entitled source through
 * player-api.supportingcast.fm and enforces access there. We mount it out of sight, wait for it to
 * settle, then hand that element to the player bar. Every control stays ours; the URL, the
 * entitlement check and the play accounting stay theirs.
 *
 * Anything that fails — no token, script blocked, no audio element — simply returns, and the page
 * keeps the public audio it already had.
 */
export function MemberAudio({ episodeGuid, trackId }: { episodeGuid?: string | null; trackId?: string }) {
  const { adoptAudio, playing } = usePlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const [token, setToken] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "waiting" | "mounting" | "adopted" | "unavailable">("idle");

  /**
   * Watch for the token appearing, rather than reading it once and giving up.
   *
   * Signing in happens somewhere else — another tab, or the magic link opening /account and the
   * listener navigating back. On mobile that is the normal flow: open the episode, leave for the
   * mail app, come back to the same tab. Nothing about this component's props changes when that
   * happens, so without these listeners a page opened before signing in serves the public audio
   * until a hard reload. pageshow covers the back/forward cache, where a restored page runs no
   * effects at all.
   */
  useEffect(() => {
    const check = () => setToken((prev) => prev ?? liveToken());
    check();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "sc_widget_token") check();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
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
    (guid: string, auth: string) => {
      const host = hostRef.current;
      if (!host || mountedRef.current) return;
      mountedRef.current = true;
      setState("mounting");

      const el = document.createElement("div");
      el.className = "sc-player";
      // Verified against player/config: the private feed's RSS guid resolves on its own, and the
      // response hands back this same feed uuid. Sending both is belt and braces, not necessity.
      el.setAttribute("data-episode-guid", guid);
      el.setAttribute("data-feed-uuid", SC_FEED_UUID);
      el.setAttribute("data-autoinit", "false");
      el.setAttribute("data-auth-token", auth);
      el.setAttribute("data-show-description", "false");
      host.appendChild(el);

      let tries = 0;
      const poll = setInterval(() => {
        const audio = el.querySelector("audio");
        if (audio) {
          clearInterval(poll);
          adoptAudio(audio, trackId);
          setState("adopted");
        } else if (++tries > 40) {
          clearInterval(poll);
          setState("unavailable");
        }
      }, 250);

      const start = () => {
        try {
          window.ScPlayer?.init(el, { authToken: auth });
        } catch {
          clearInterval(poll);
          setState("unavailable");
        }
      };

      const existing = document.querySelector<HTMLScriptElement>(`script[src*="sc-player"]`);
      if (existing && window.ScPlayer) {
        start();
        return;
      }
      existing?.remove();
      const s = document.createElement("script");
      // NOT type="module", despite their docs saying so. The bundle is a plain IIFE that sets
      // window.ScPlayer, and their CDN sends no Access-Control-Allow-Origin — a module script is
      // always fetched in CORS mode, so it can never load cross-origin.
      s.src = SC_PLAYER_JS;
      s.onload = start;
      s.onerror = () => {
        clearInterval(poll);
        setState("unavailable");
      };
      document.body.appendChild(s);
    },
    [adoptAudio, trackId],
  );

  useEffect(() => {
    if (!episodeGuid || !token || mountedRef.current) return;

    // Never swap the source out from under someone mid-episode. The two cuts are different
    // lengths — Supporting Cast reports S1E27 as 1733s against 2103s on the ad-stitched public
    // feed — so there is no honest position to carry across, and yanking the audio to restart an
    // episode somebody is 20 minutes into is worse than letting this one finish as it started.
    // The moment they pause, or move to another episode, the ad-free cut takes over.
    if (playing) {
      setState("waiting");
      return;
    }
    mount(episodeGuid, token);
  }, [episodeGuid, token, playing, mount]);

  useEffect(
    () => () => {
      // Hand playback back to our own element; their element goes with the unmount.
      adoptAudio(null);
    },
    [adoptAudio],
  );

  // Their player is never seen: it is the audio source, not the interface. Kept in the layout
  // rather than display:none, since a detached or undisplayed player may not initialise at all.
  //
  // ?debug=audio surfaces what actually happened, because otherwise every failure mode looks
  // identical from the outside: the public audio just plays.
  const debug =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("debug") === "audio";

  return (
    <>
      <div
        ref={hostRef}
        aria-hidden
        data-member-audio={state}
        className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -left-[9999px]"
      />
      {debug && (
        <div className="fixed bottom-24 left-3 z-50 border border-yellow bg-ink px-3 py-2 font-mono text-xs text-paper">
          member audio: <b className="text-yellow">{state}</b>
          <br />
          guid: {episodeGuid ? `${episodeGuid.slice(0, 10)}…` : "none"}
          <br />
          token: {token ? "live" : "none/expired"}
        </div>
      )}
    </>
  );
}
