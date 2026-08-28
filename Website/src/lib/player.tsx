"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

export type Track = {
  id: string; // guid/slug, used for resume position
  title: string;
  subtitle?: string;
  src: string;
  image?: string;
  href?: string; // episode page
};

type PlayerCtx = {
  track: Track | null;
  playing: boolean;
  time: number;
  duration: number;
  rate: number;
  /** Neighboring episodes of the current track (for prev/next buttons); null while unknown. */
  neighbors: { prev: Track | null; next: Track | null };
  /** Listen order: full show by release date, or one strand. Persisted. */
  order: "full" | "redacted" | "postmortem";
  setOrder: (o: "full" | "redacted" | "postmortem") => void;
  expanded: boolean;
  setExpanded: (v: boolean) => void;
  jump: (dir: "prev" | "next") => void;
  load: (t: Track, autoplay?: boolean) => void;
  toggle: (t?: Track) => void;
  seek: (s: number) => void;
  skip: (delta: number) => void;
  setRate: (r: number) => void;
  /** 0..1. iOS ignores writes to audio.volume, so the UI hides the slider on touch. */
  /**
   * Hand the player a foreign <audio> to drive instead of its own — Supporting Cast's player
   * creates a real audio element for entitled members, and the bar becomes its face. Pass null
   * to go back to ours. Everything else (positions, prev/next, speed, volume) is unchanged.
   */
  /** Drive a foreign <audio>. forTrackId names the episode it carries, so the bar never plays it under another title. */
  adoptAudio: (el: HTMLAudioElement | null, forTrackId?: string) => void;
  /** True while a foreign element is driving playback. */
  adopted: boolean;
  volume: number;
  muted: boolean;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  close: () => void;
  progressFor: (id: string) => number; // 0..1 from saved position
};

const Ctx = createContext<PlayerCtx | null>(null);
const POS_KEY = "tru-player-pos";
const LAST_KEY = "tru-player-last";
const VOL_KEY = "tru-player-volume";
const MUTE_KEY = "tru-player-muted";

function readPos(): Record<string, { t: number; d: number }> {
  try {
    return JSON.parse(localStorage.getItem(POS_KEY) ?? "{}");
  } catch {
    return {};
  }
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [track, setTrack] = useState<Track | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRateState] = useState(1);
  const [positions, setPositions] = useState<Record<string, { t: number; d: number }>>({});
  const [neighbors, setNeighbors] = useState<{ prev: Track | null; next: Track | null }>({ prev: null, next: null });
  const [expanded, setExpanded] = useState(false);
  const [order, setOrderState] = useState<"full" | "redacted" | "postmortem">("full");
  // null = the player owns its element. Set, and the binding effect below re-runs against
  // the foreign one; its owner is responsible for creating and destroying it.
  const [external, setExternal] = useState<HTMLAudioElement | null>(null);
  // Which track the adopted element is carrying. Supporting Cast's element holds ONE entitled
  // episode; playing anything else through it would be the wrong audio under the right title.
  const adoptedFor = useRef<string | null>(null);
  // Kept for the life of the provider. Rebuilding it on every adopt/release threw away volume,
  // rate and position, and left load() with nothing to fall back to mid-call.
  const internal = useRef<HTMLAudioElement | null>(null);
  const getInternal = useCallback(() => {
    if (!internal.current) {
      const a = new Audio();
      a.preload = "metadata";
      internal.current = a;
    }
    return internal.current;
  }, []);
  const [volume, setVolumeState] = useState(1);
  const [muted, setMutedState] = useState(false);
  useEffect(() => {
    try {
      const o = localStorage.getItem("player-order");
      if (o === "full" || o === "redacted" || o === "postmortem") setOrderState(o);
      // Number(null) is 0, so reading an absent key straight through starts every new
      // visitor silent. Absent or empty has to mean "leave the default alone".
      const raw = localStorage.getItem(VOL_KEY);
      const v = raw === null || raw === "" ? NaN : Number(raw);
      if (Number.isFinite(v) && v >= 0 && v <= 1) setVolumeState(v);
      setMutedState(localStorage.getItem(MUTE_KEY) === "1");
    } catch {}
  }, []);

  // Push level/mute onto the element whenever either changes, including right after it is created.
  useEffect(() => {
    const a = audio.current;
    if (!a) return;
    a.volume = volume;
    a.muted = muted;
  }, [volume, muted, track]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.min(1, Math.max(0, v));
    setVolumeState(clamped);
    // Dragging up from silence is an unmute; nobody expects to do it in two steps.
    if (clamped > 0) setMutedState(false);
    try {
      localStorage.setItem(VOL_KEY, String(clamped));
      if (clamped > 0) localStorage.setItem(MUTE_KEY, "0");
    } catch {}
  }, []);

  const toggleMute = useCallback(() => {
    setMutedState((m) => {
      const next = !m;
      try {
        localStorage.setItem(MUTE_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  }, []);
  const setOrder = useCallback((o: "full" | "redacted" | "postmortem") => {
    setOrderState(o);
    try {
      localStorage.setItem("player-order", o);
    } catch {}
  }, []);

  // Bind to the element we are driving: ours by default, or an adopted one. Re-runs on swap.
  useEffect(() => {
    const a = external ?? getInternal();
    audio.current = a;
    setPositions(readPos());
    // Restore last track (paused) so the bar comes back after a reload. Only for our own element:
    // an adopted one already has its source, chosen by whoever owns it.
    if (!external) {
      try {
        const last = localStorage.getItem(LAST_KEY);
        if (last) {
          const t = JSON.parse(last) as Track;
          a.src = t.src;
          const p = readPos()[t.id];
          if (p?.t) a.addEventListener("loadedmetadata", () => (a.currentTime = p.t), { once: true });
          setTrack(t);
        }
      } catch {}
    }
    const onT = () => setTime(a.currentTime);
    const onD = () => setDuration(a.duration || 0);
    const onP = () => setPlaying(true);
    const onPa = () => setPlaying(false);
    const onEnd = async () => {
      setPlaying(false);
      // Autoplay the next episode in order
      try {
        const cur = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as Track | null;
        if (!cur) return;
        const ord = (() => {
          try {
            return localStorage.getItem("player-order") ?? "full";
          } catch {
            return "full";
          }
        })();
        const r = await fetch(`/api/next?guid=${encodeURIComponent(cur.id)}&order=${ord}`);
        const { next } = (await r.json()) as { next: Track | null };
        if (next) {
          // Their element serves one entitled episode. Hand playback back to ours before
          // moving on, rather than pointing theirs at the next public file.
          const target = external ? getInternal() : a;
          if (external) {
            adoptedFor.current = null;
            setExternal(null);
            audio.current = target;
          }
          target.src = next.src;
          setTrack(next);
          localStorage.setItem(LAST_KEY, JSON.stringify(next));
          target.play().catch(() => {});
        }
      } catch {}
    };
    a.addEventListener("timeupdate", onT);
    a.addEventListener("loadedmetadata", onD);
    a.addEventListener("durationchange", onD);
    a.addEventListener("play", onP);
    a.addEventListener("pause", onPa);
    a.addEventListener("ended", onEnd);
    return () => {
      // Never tear down a foreign element — its owner does that.
      if (!external) a.pause();
      a.removeEventListener("timeupdate", onT);
      a.removeEventListener("loadedmetadata", onD);
      a.removeEventListener("durationchange", onD);
      a.removeEventListener("play", onP);
      a.removeEventListener("pause", onPa);
      a.removeEventListener("ended", onEnd);
    };
  }, [external, getInternal]);

  // Adopting mid-playback should not leave the old element running underneath.
  const adoptAudio = useCallback((el: HTMLAudioElement | null, forTrackId?: string) => {
    adoptedFor.current = el ? forTrackId ?? null : null;
    setExternal((prev) => {
      if (prev === el) return prev;
      try {
        audio.current?.pause();
      } catch {}
      return el;
    });
  }, []);

  // Know the surrounding episodes so the bar can offer prev/next
  useEffect(() => {
    setNeighbors({ prev: null, next: null });
    if (!track) return;
    let dead = false;
    fetch(`/api/next?guid=${encodeURIComponent(track.id)}&order=${order}`)
      .then((r) => r.json())
      .then((d: { prev: Track | null; next: Track | null }) => {
        if (!dead) setNeighbors({ prev: d.prev ?? null, next: d.next ?? null });
      })
      .catch(() => {});
    return () => {
      dead = true;
    };
  }, [track, order]);

  // Persist position every few seconds
  useEffect(() => {
    if (!track || !duration) return;
    const id = setInterval(() => {
      const a = audio.current;
      if (!a || a.paused) return;
      setPositions((p) => {
        const next = { ...p, [track.id]: { t: a.currentTime, d: a.duration || duration } };
        try {
          localStorage.setItem(POS_KEY, JSON.stringify(next));
        } catch {}
        return next;
      });
    }, 4000);
    return () => clearInterval(id);
  }, [track, duration]);

  // Media Session (lock screen / hardware keys)
  useEffect(() => {
    if (!track || !("mediaSession" in navigator)) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.title,
      artist: "REDACTED",
      album: track.subtitle,
      artwork: track.image ? [{ src: track.image, sizes: "512x512", type: "image/jpeg" }] : [],
    });
    const a = audio.current!;
    navigator.mediaSession.setActionHandler("play", () => a.play());
    navigator.mediaSession.setActionHandler("pause", () => a.pause());
    navigator.mediaSession.setActionHandler("seekbackward", () => (a.currentTime = Math.max(0, a.currentTime - 15)));
    navigator.mediaSession.setActionHandler("seekforward", () => (a.currentTime = Math.min(a.duration || 0, a.currentTime + 30)));
  }, [track]);

  const load = useCallback(
    (t: Track, autoplay = true) => {
      // Supporting Cast's element already points at the member's entitled file. Assigning t.src
      // over it swapped in the public, ad-stitched audio the moment anyone pressed play, which
      // made the whole member-audio path a no-op. Their source is left alone; if the bar is asked
      // for a DIFFERENT episode, their element is handed back first rather than repurposed.
      const adoptedHere = !!external && adoptedFor.current === t.id;
      let a = audio.current;
      if (external && !adoptedHere) {
        adoptedFor.current = null;
        setExternal(null);
        a = getInternal();
        audio.current = a;
      }
      if (!a) return;
      if (track?.id !== t.id) {
        if (!adoptedHere) a.src = t.src;
        const p = readPos()[t.id];
        const resumeAt = p && p.d - p.t > 10 ? p.t : 0;
        if (resumeAt) a.addEventListener("loadedmetadata", () => (a.currentTime = resumeAt), { once: true });
        setTrack(t);
        try {
          localStorage.setItem(LAST_KEY, JSON.stringify(t));
        } catch {}
      }
      a.playbackRate = rate;
      if (autoplay) a.play().catch(() => {});
    },
    [track?.id, rate, external, getInternal],
  );

  const toggle = useCallback(
    (t?: Track) => {
      const a = audio.current;
      if (!a) return;
      if (t && t.id !== track?.id) return load(t, true);
      if (a.paused) a.play().catch(() => {});
      else a.pause();
    },
    [track?.id, load],
  );

  const seek = useCallback((s: number) => {
    const a = audio.current;
    if (a) a.currentTime = Math.max(0, Math.min(a.duration || s, s));
  }, []);
  const skip = useCallback((d: number) => seek((audio.current?.currentTime ?? 0) + d), [seek]);
  const setRate = useCallback((r: number) => {
    setRateState(r);
    if (audio.current) audio.current.playbackRate = r;
  }, []);
  const close = useCallback(() => {
    audio.current?.pause();
    setTrack(null);
    setExpanded(false);
    try {
      localStorage.removeItem(LAST_KEY);
    } catch {}
  }, []);
  const jump = useCallback(
    (dir: "prev" | "next") => {
      const t = neighbors[dir];
      if (t) load(t, true);
    },
    [neighbors, load],
  );
  const jumpRef = useRef(jump);
  jumpRef.current = jump;

  // Lock-screen / hardware prev-next follow the neighbor list
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;
    navigator.mediaSession.setActionHandler("previoustrack", neighbors.prev ? () => jumpRef.current("prev") : null);
    navigator.mediaSession.setActionHandler("nexttrack", neighbors.next ? () => jumpRef.current("next") : null);
  }, [neighbors]);
  const progressFor = useCallback(
    (id: string) => {
      if (track?.id === id && duration) return time / duration;
      const p = positions[id];
      return p && p.d ? p.t / p.d : 0;
    },
    [positions, track?.id, time, duration],
  );

  const value = useMemo<PlayerCtx>(
    () => ({ track, playing, time, duration, rate, neighbors, order, setOrder, expanded, setExpanded, jump, load, toggle, seek, skip, setRate, close, progressFor, volume, muted, setVolume, toggleMute, adoptAudio, adopted: !!external }),
    [track, playing, time, duration, rate, neighbors, order, setOrder, expanded, jump, load, toggle, seek, skip, setRate, close, progressFor, volume, muted, setVolume, toggleMute, adoptAudio, external],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePlayer() {
  const c = useContext(Ctx);
  if (!c) throw new Error("usePlayer outside PlayerProvider");
  return c;
}

export function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = Math.floor(s % 60);
  return h ? `${h}:${m.toString().padStart(2, "0")}:${r.toString().padStart(2, "0")}` : `${m}:${r.toString().padStart(2, "0")}`;
}
