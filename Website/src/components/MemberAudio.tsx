"use client";

import { useEffect, useRef, useState } from "react";
import { usePlayer } from "@/lib/player";

declare global {
  interface Window {
    ScPlayer?: { init: (el: Element, opts?: { authToken?: string }) => void };
  }
}

const SC_PLAYER_JS = "https://media.supportingcast.fm/js/sc-player.js";
const TOKEN_KEY = "sc_widget_token";

/**
 * Plays the member's ad-free audio through OUR player, without going around Supporting Cast.
 *
 * Their sc-player builds a real <audio> element (verified on their own listen page — no iframe),
 * resolves the entitled source and enforces access. We mount it out of sight, wait for it to
 * settle, then hand that element to the player bar. Every control stays ours; the URL, the
 * entitlement check and the free-fallback behaviour stay theirs.
 *
 * Anything that fails — no token, no episode uuid, script blocked, no audio element — simply
 * returns, and the page keeps the public audio it already had.
 */
export function MemberAudio({ episodeUuid }: { episodeUuid?: string | null }) {
  const { adoptAudio } = usePlayer();
  const hostRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "mounting" | "adopted" | "unavailable">("idle");

  useEffect(() => {
    if (!episodeUuid) return;
    let token: string | null = null;
    try {
      token = localStorage.getItem(TOKEN_KEY);
    } catch {
      /* private mode: no member session to speak of */
    }
    if (!token) return;

    const host = hostRef.current;
    if (!host || host.querySelector(".sc-player")) return;
    setState("mounting");

    const mount = document.createElement("div");
    mount.className = "sc-player";
    mount.setAttribute("data-episode-uuid", episodeUuid);
    mount.setAttribute("data-autoinit", "false");
    mount.setAttribute("data-auth-token", token);
    mount.setAttribute("data-show-description", "false");
    host.appendChild(mount);

    let dead = false;
    let poll: ReturnType<typeof setInterval> | null = null;

    // The element appears some time after init resolves the source, so watch for it rather than
    // assuming it is there. Give up quietly rather than leaving a listener running forever.
    const watchForAudio = () => {
      let tries = 0;
      poll = setInterval(() => {
        if (dead) return;
        const el = mount.querySelector("audio");
        if (el) {
          clearInterval(poll!);
          adoptAudio(el);
          setState("adopted");
        } else if (++tries > 40) {
          clearInterval(poll!);
          setState("unavailable");
        }
      }, 250);
    };

    const start = () => {
      try {
        window.ScPlayer?.init(mount, { authToken: token! });
      } catch {
        setState("unavailable");
        return;
      }
      watchForAudio();
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src*="sc-player"]`);
    if (existing && window.ScPlayer) {
      start();
    } else {
      existing?.remove();
      const s = document.createElement("script");
      // NOT type="module", despite their docs saying so. The bundle is a plain IIFE that sets
      // window.ScPlayer, and their CDN sends no Access-Control-Allow-Origin — a module script is
      // always fetched in CORS mode, so it can never load cross-origin. Verified: as a module it
      // fails outright; as a classic script it loads and mounts.
      s.src = SC_PLAYER_JS;
      s.onload = start;
      s.onerror = () => setState("unavailable");
      document.body.appendChild(s);
    }

    return () => {
      dead = true;
      if (poll) clearInterval(poll);
      // Hand playback back to our own element; their element goes with the unmount.
      adoptAudio(null);
    };
  }, [episodeUuid, adoptAudio]);

  // Their player is never seen: it is the audio source, not the interface. Kept in the layout
  // rather than display:none, since a detached or undisplayed player may not initialise at all.
  return (
    <div
      ref={hostRef}
      aria-hidden
      data-member-audio={state}
      className="absolute w-px h-px overflow-hidden opacity-0 pointer-events-none -left-[9999px]"
    />
  );
}
