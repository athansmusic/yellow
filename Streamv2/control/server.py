#!/usr/bin/env python3
"""Local control panel for the Live Listen episode info.

You type the episode details in a browser tab; the OBS overlay updates
instantly over Server-Sent Events - no source refresh, no scene reload, no
flicker on stream.

Deliberately dependency-free (stdlib only) and bound to 127.0.0.1, so there is
nothing to install and nothing reachable from outside this machine.

The design of the overlay is NOT the point of this file. /overlay is a plain
reference renderer. When your Claude Design version is ready, drop it in
overlays/ and point config.json -> control_panel.episode_overlay_url at it; it
only has to read GET /state once and then listen to GET /events. The contract
is at the bottom of this docstring and will not change.

    GET  /            control panel (type here)
    GET  /overlay     reference overlay for OBS
    GET  /state       {"episode":"", "title":"", "guest":"", "visible":false}
    POST /state       partial update, same shape; broadcasts to all listeners
    GET  /events      SSE stream, one "data: <state json>" per change

Usage:
    python control/server.py
    python control/server.py --port 8722
"""

from __future__ import annotations

import argparse
import json
import queue
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

from firebot import Firebot
from obs_watch import ObsLink
from rvb import Teams
from twitch_chat import TwitchChat

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
STATE_FILE = HERE / "state.json"
OVERLAY_DIR = ROOT / "overlays"
ASSET_DIR = OVERLAY_DIR / "assets"

DEFAULT_STATE = {
    # Which Live Listen layout the stage renders.
    "scene": "two",             # "two" | "solo"

    # Show selection + per-show palettes. Every overlay maps these four onto
    # its own CSS variables at render; a missing key falls back to the
    # overlay's built-in default, so a partial palette can never blank a
    # layout. Adding a show = adding a key here via the panel.
    "show": "REDACTED",
    "themes": {
        "REDACTED": {
            "bg":     "#060607",   # ground / panels
            "accent": "#f4e409",   # waveform, borders, ticks, chips
            "text":   "#f7f7f5",   # display type
            "muted":  "#9a9aa2",   # secondary copy
            # Show assets. logo is a filename under overlays/assets (web-
            # served); the bg pair are OBS file paths pushed into the [BG]
            # scene's Image and Media sources when the theme changes.
            "logo":    "show-logo.png",
            "bgImage": "C:/Users/19407/Documents/Redacted/Website v2/redactedheroimage.png",
            "bgVideo": "C:/Users/19407/Documents/Redacted/Script/Streamv2/media/16mm_Film_Frame_With_Noise_source_1749841.mp4",
        },
    },

    # Episode block. These are the show's standing defaults - a fresh start
    # comes up ready to stream, and only the episode fields change week to week.
    "showName": "REDACTED",
    "episodeNumber": "01",
    "episodeTitle": "FALSE START (PART 1)",
    "episodeBlurb": "Jacob makes a big change.",

    # People. Role is the character, name is the performer.
    "hostA": "Athan",
    "hostARole": "ELI REYES",
    "hostB": "Jamie",
    "hostBRole": "JACOB KANE",
    "handle": "@theredactedunit",
    "cadence": "SOUND ALERTS ARE DISABLED FOR THIS LIVE EVENT",

    # Per-stream sub goal, shown by overlays/subgoal.html. The count comes
    # from the credits store; only the target lives here.
    "subGoal": "5",

    # RED VS BLUE score bar visibility, driven by the peek redeem's timer.
    "scorePeek": False,

    # No viewerCount field. Nothing feeds it, so it could only ever display
    # a number somebody typed - i.e. a wrong one, live on stream.
    "messages": [],             # [{name, text, badge, nameColor}] - newest last
    "alertName": "",
    "alertMeta": "",

    # Ending scene copy.
    "endTitle": "THANKS FOR WATCHING",
    "endSubtitle": "make sure you say !gn",
    "endCreditsLabel": "this stream",
    "endFooter": "see you next stream",

    # Legacy lower-third overlay (overlays/episode.html)
    "episode": "",
    "title": "",
    "guest": "",
    "visible": False,
}

_lock = threading.Lock()
_state: dict = dict(DEFAULT_STATE)
_listeners: list[queue.Queue] = []

# RED VS BLUE. Set up in main() when config enables it; None otherwise so
# every call site can stay a plain truthiness check.
_teams: Teams | None = None

# Firebot bridge - the only authenticated path to Twitch chat.
_fb: Firebot | None = None

# Draft stamps waiting to be shown, newest last. Overlays pop them off the
# state broadcast; kept tiny because a stamp missed is not worth replaying.
_drafts: list = []

# Layout rects, reported by an overlay from inside the renderer that actually
# draws it, keyed "<layer>:<scene>". Measured, never computed: the episode
# block's height depends on how its title wraps, so every panel below it
# shifts. Deliberately not persisted - each load re-reports, so a stale rect
# can never outlive a design change.
_slots: dict = {}


def _load_cfg() -> dict:
    cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
    local = ROOT / "config.local.json"
    if local.exists():
        for k, v in json.loads(local.read_text(encoding="utf-8")).items():
            if isinstance(v, dict) and isinstance(cfg.get(k), dict):
                cfg[k].update(v)
            else:
                cfg[k] = v
    return cfg


def _twitch_cfg() -> dict:
    try:
        return {k: v for k, v in _load_cfg().get("twitch", {}).items()
                if not k.startswith("_")}
    except (OSError, json.JSONDecodeError):
        return {}


def load_state() -> None:
    global _state
    if STATE_FILE.exists():
        try:
            saved = json.loads(STATE_FILE.read_text(encoding="utf-8"))
            # Only keys we still recognise. A retired field left in the file
            # would otherwise come straight back on the next restart.
            _state = {**DEFAULT_STATE,
                      **{k: v for k, v in saved.items() if k in DEFAULT_STATE}}
            # Themes saved by an older build may predate newer per-show keys
            # (logo, bg files). Backfill defaults per built-in show, so a new
            # field appears with its standing value instead of KeyErroring.
            # Custom shows are kept exactly as saved.
            themes = dict(_state.get("themes") or {})
            for name, defaults in DEFAULT_STATE["themes"].items():
                themes[name] = {**defaults, **themes.get(name, {})}
            _state["themes"] = themes
        except (json.JSONDecodeError, OSError):
            # A corrupt state file must never stop the stream from starting.
            _state = dict(DEFAULT_STATE)


def save_state() -> None:
    try:
        STATE_FILE.write_text(json.dumps(_state, indent=2), encoding="utf-8")
    except OSError:
        pass


# ---- Credits ------------------------------------------------------------
# Deliberately NOT part of _state. "Reset to defaults" restores the episode
# fields, and it must never take the stream's subscriber list with it.
CREDITS_FILE = HERE / "credits.json"
_credits: dict = {"subs": [], "bits": []}


def load_credits() -> None:
    global _credits
    if CREDITS_FILE.exists():
        try:
            saved = json.loads(CREDITS_FILE.read_text(encoding="utf-8"))
            _credits = {"subs": saved.get("subs", []), "bits": saved.get("bits", [])}
        except (json.JSONDecodeError, OSError):
            _credits = {"subs": [], "bits": []}


def save_credits() -> None:
    try:
        CREDITS_FILE.write_text(json.dumps(_credits, indent=2), encoding="utf-8")
    except OSError:
        pass


def add_sub(event: dict) -> None:
    """Record a subscription for the end-screen roll.

    Deduped by user: a resub after a sub updates the same row rather than
    listing somebody twice, and repeat gifting accumulates onto one line.
    """
    with _lock:
        rows = _credits["subs"]
        existing = next((r for r in rows if r["user"] == event["user"]), None)
        if existing is None:
            existing = {"user": event["user"], "name": event["name"],
                        "message": "", "months": 0, "gifted": 0, "kind": event["kind"],
                        "tier": "", "ts": time.time()}
            rows.append(existing)
        existing["name"] = event["name"] or existing["name"]
        existing["months"] = max(existing["months"], event.get("months", 0))
        existing["gifted"] += event.get("gifted", 0)
        # msg-param-sub-plan: "Prime", "1000", "2000", "3000".
        if event.get("tier"):
            existing["tier"] = event["tier"]
        # Keep the first message they wrote; a later silent resub must not
        # blank out something they took the trouble to type.
        if event.get("message") and not existing["message"]:
            existing["message"] = event["message"][:200]
        if existing["gifted"]:
            existing["kind"] = "gifter"
        save_credits()
    if _teams is not None:
        _teams.on_sub(event["user"], event.get("name", ""),
                      int(event.get("gifted", 0)))
    _broadcast()


def add_bits(event: dict) -> None:
    with _lock:
        rows = _credits["bits"]
        existing = next((r for r in rows if r["user"] == event["user"]), None)
        if existing is None:
            existing = {"user": event["user"], "name": event["name"],
                        "bits": 0, "ts": time.time()}
            rows.append(existing)
        existing["name"] = event["name"] or existing["name"]
        existing["bits"] += event.get("bits", 0)
        save_credits()
    if _teams is not None:
        _teams.on_bits(event["user"], event.get("name", ""),
                       int(event.get("bits", 0)))
    _broadcast()


def reset_credits() -> dict:
    with _lock:
        _credits["subs"] = []
        _credits["bits"] = []
        save_credits()
        snapshot = json.loads(json.dumps(_credits))
    _broadcast()
    return snapshot


_simulator = None


def _get_simulator():
    """A TwitchChat used only to parse replayed lines. Never started."""
    global _simulator
    if _simulator is None:
        _simulator = TwitchChat(
            channel="simulation",
            on_message=push_message,
            on_clear_user=lambda u: None,
            on_clear_msg=lambda i: None,
            on_clear_all=lambda: None,
            on_sub=add_sub,
            on_bits=add_bits,
            log=lambda *a: None,
        )
    return _simulator


class _NullSock:
    """PING replies go nowhere during replay."""

    def sendall(self, _data: bytes) -> None:
        pass


def simulate_line(line: str) -> None:
    _get_simulator()._handle(_NullSock(), line)


# ---- Starting Soon chat counter ------------------------------------------
# Counts EVERY chat message from the moment the stream starts until the
# countdown video ends. Total messages, not unique chatters - one person
# spamming is the point.
RECORD_FILE = HERE / "chat_record.json"
_startup = {"count": 0, "record": 0, "counting": False}


def load_record() -> None:
    if RECORD_FILE.exists():
        try:
            _startup["record"] = int(json.loads(
                RECORD_FILE.read_text(encoding="utf-8")).get("record", 0))
        except (json.JSONDecodeError, OSError, ValueError):
            _startup["record"] = 0


def save_record() -> None:
    try:
        RECORD_FILE.write_text(json.dumps({"record": _startup["record"]}, indent=2),
                               encoding="utf-8")
    except OSError:
        pass


def startup_begin() -> None:
    with _lock:
        _startup["count"] = 0
        _startup["counting"] = True
    _broadcast()


def startup_tick() -> None:
    with _lock:
        if not _startup["counting"]:
            return
        _startup["count"] += 1
        # Update the record live, so the overlay shows it being beaten rather
        # than only revealing it after the fact.
        if _startup["count"] > _startup["record"]:
            _startup["record"] = _startup["count"]
            save_record()
    _broadcast()


def startup_end() -> None:
    with _lock:
        if not _startup["counting"]:
            return
        _startup["counting"] = False
        if _startup["count"] > _startup["record"]:
            _startup["record"] = _startup["count"]
        save_record()
    _broadcast()


def push_message(msg: dict) -> None:
    """Append a chat line and drop the oldest beyond the cap."""
    startup_tick()
    # RED VS BLUE sees every message - draft on first chat of the month,
    # attendance, capped chat points. Deliberately BEFORE the ignore/command
    # filters below: those are display rules, and the reader may see chat
    # even where it must not draw it.
    if _teams is not None:
        _teams.on_chat(msg.get("user", ""), msg.get("name", ""))
        trigger = _rvb_cfg().get("command", {}).get("trigger", "!team")
        if msg.get("text", "").strip().lower().startswith(trigger):
            handle_team_command(msg.get("user", ""), msg.get("name", ""))
    cfg = _twitch_cfg()
    if msg["user"] in {u.lower() for u in cfg.get("ignore_users", [])}:
        return
    if cfg.get("hide_commands") and msg["text"].startswith("!"):
        return
    text = "".join(ch for ch in msg["text"] if ch >= " ")[:220]
    if not text.strip():
        return
    # Keep the emote/text split, dropping runs emptied by the control-char strip.
    parts = [p for p in (msg.get("parts") or [{"t": "text", "v": text}])
             if p["t"] == "emote" or "".join(c for c in p["v"] if c >= " ").strip()]
    entry = {"id": msg["id"], "user": msg["user"], "name": msg["name"][:26],
             "text": text, "parts": parts, "badge": msg["badge"],
             "ts": time.time()}
    if cfg.get("use_twitch_colors") and msg.get("color"):
        entry["nameColor"] = msg["color"]
    with _lock:
        msgs = list(_state.get("messages") or [])
        msgs.append(entry)
        _state["messages"] = msgs[-int(cfg.get("max_messages", 12)):]
    _broadcast()


def drop_messages(pred) -> None:
    """Remove chat lines matching pred - used for mod deletions and bans."""
    with _lock:
        msgs = [m for m in (_state.get("messages") or []) if not pred(m)]
        if len(msgs) == len(_state.get("messages") or []):
            return
        _state["messages"] = msgs
    _broadcast()


def _rvb_cfg() -> dict:
    return {k: v for k, v in _load_cfg().get("rvb", {}).items()
            if not k.startswith("_")}


def announce_draft(user: str, name: str, team: str) -> None:
    """On-screen stamp plus the chat line. Called by Teams on a fresh draft.

    The stamp rides our own SSE; the chat line goes through Firebot,
    because this process reads Twitch anonymously and holds no token.
    """
    _drafts.append({"name": name, "team": team, "ts": time.time()})
    del _drafts[:-6]   # a stamp missed is not worth replaying
    print(f"  [rvb] {name} drafted to {team.upper()}", flush=True)
    if _fb is not None:
        fb_cfg = _rvb_cfg().get("firebot", {})
        _fb.run_preset(fb_cfg.get("draft_preset", "RVB Draft"),
                       {"username": name, "team": team.upper()})


# Per-user cooldown for !team, so the command cannot be used to spam chat.
_cmd_seen: dict = {}


def handle_team_command(user: str, name: str) -> None:
    """Reply to !team with the sender's team, points and standing."""
    if _teams is None or _fb is None:
        return
    cfg = _rvb_cfg()
    cool = float(cfg.get("command", {}).get("cooldown_seconds", 30))
    now = time.time()
    if now - _cmd_seen.get(user, 0) < cool:
        return
    _cmd_seen[user] = now
    # Drafts them if this is somehow their first message; that is correct -
    # asking which team you are on should put you on one.
    team, _ = _teams.draft(user, name)
    snap = _teams.snapshot()
    mine = snap.get(team, 0)
    other = snap.get("blue" if team == "red" else "red", 0)
    rank = "leading" if mine > other else ("trailing" if mine < other else "tied")
    _fb.run_preset(cfg.get("firebot", {}).get("team_preset", "RVB Team"),
                   {"username": name, "team": team.upper(),
                    "points": str(mine), "rank": rank,
                    "red": str(snap.get("red", 0)),
                    "blue": str(snap.get("blue", 0))})


def _rvb_payload() -> dict:
    """Team standings for the state broadcast, plus any pending draft
    stamps. Safe to call without the lock - Teams has its own."""
    if _teams is None:
        return {"enabled": False}
    snap = _teams.snapshot()
    snap["drafts"] = list(_drafts)
    # The room follows the broadcast: a change of lead repaints the lamps.
    # No-ops unless the lead actually changed.
    _lamps_to_team()
    return snap


def _broadcast() -> None:
    rvb = _rvb_payload()
    with _lock:
        snapshot = dict(_state)
        snapshot["credits"] = json.loads(json.dumps(_credits))
        snapshot["startup"] = dict(_startup)
        snapshot["rvb"] = rvb
        save_state()
        dead = []
        for q in _listeners:
            try:
                q.put_nowait(snapshot)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _listeners.remove(q)


# What was last pushed to the [BG] sources, so a state churn (every chat
# message runs update_state) never re-sends identical file paths to OBS.
_bg_pushed = {"bgImage": None, "bgVideo": None}


def _sync_bg_sources() -> None:
    """Push the active theme's bg files into the [BG] scene's sources.

    Called with _lock held. Fire-and-forget via the ObsLink socket, so it
    cannot block state updates; if OBS is down the next theme change tries
    again.
    """
    theme = (_state.get("themes") or {}).get(_state.get("show"), {})
    link = _obs.get("link")
    if not link:
        return
    plan = (("bgImage", "Image", "file"),
            ("bgVideo", "Media", "local_file"))
    for key, input_name, setting in plan:
        path = theme.get(key)
        if path and path != _bg_pushed[key]:
            if link.request("SetInputSettings", {
                    "inputName": input_name,
                    "inputSettings": {setting: path}}):
                _bg_pushed[key] = path


def update_state(patch: dict) -> dict:
    rvb = _rvb_payload()
    with _lock:
        for k in DEFAULT_STATE:
            if k in patch:
                _state[k] = patch[k]
        if "show" in patch or "themes" in patch:
            _sync_bg_sources()
        snapshot = dict(_state)
        snapshot["credits"] = json.loads(json.dumps(_credits))
        snapshot["startup"] = dict(_startup)
        snapshot["rvb"] = rvb
        save_state()
        dead = []
        for q in _listeners:
            try:
                q.put_nowait(snapshot)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _listeners.remove(q)
    return snapshot


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):  # quieter console during a stream
        pass

    # -- helpers -----------------------------------------------------------
    def _send(self, body: bytes, ctype: str, status: int = 200) -> None:
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _send_file(self, path: Path, ctype: str) -> None:
        if not path.exists():
            self._send(b"not found", "text/plain", 404)
            return
        self._send(path.read_bytes(), ctype)

    # -- routes ------------------------------------------------------------
    def do_GET(self) -> None:
        route = self.path.split("?", 1)[0].rstrip("/") or "/"

        if route == "/":
            self._send_file(OVERLAY_DIR / "panel.html", "text/html; charset=utf-8")
        elif route == "/overlay":
            self._send_file(OVERLAY_DIR / "episode.html", "text/html; charset=utf-8")
        elif route == "/credits":
            with _lock:
                body = json.dumps(_credits).encode()
            self._send(body, "application/json")
        elif route == "/effect/threshold":
            self._send(json.dumps(fire_threshold()).encode(), "application/json")
        elif route == "/effect/threshold/off":
            self._send(json.dumps(clear_threshold()).encode(), "application/json")
        elif route == "/effect/micfx":
            self._send(json.dumps(fire_micfx()).encode(), "application/json")
        elif route == "/effect/micfx/off":
            self._send(json.dumps(clear_micfx()).encode(), "application/json")
        elif route == "/frameglow":
            self._send_file(OVERLAY_DIR / "frameglow.html", "text/html; charset=utf-8")
        elif route == "/camedge":
            self._send_file(OVERLAY_DIR / "camedge.html", "text/html; charset=utf-8")
        elif route == "/rvb":
            self._send(json.dumps(_rvb_payload()).encode(), "application/json")
        elif route == "/rvb/peek":
            # Channel-point score peek: show the bar for a few seconds.
            self._send(json.dumps(rvb_peek()).encode(), "application/json")
        elif route == "/scorebar":
            self._send_file(OVERLAY_DIR / "scorebar.html", "text/html; charset=utf-8")
        elif route == "/onscreen":
            self._send_file(OVERLAY_DIR / "onscreen.html", "text/html; charset=utf-8")
        elif route == "/subgoal":
            self._send_file(OVERLAY_DIR / "subgoal.html", "text/html; charset=utf-8")
        elif route == "/splitcam":
            self._send_file(OVERLAY_DIR / "splitcam.html", "text/html; charset=utf-8")
        elif route == "/broadcast":
            self._send_file(OVERLAY_DIR / "broadcast.html", "text/html; charset=utf-8")
        elif route == "/waveform":
            self._send_file(OVERLAY_DIR / "waveform.html", "text/html; charset=utf-8")
        elif route == "/startingsoon":
            self._send_file(OVERLAY_DIR / "startingsoon.html", "text/html; charset=utf-8")
        elif route == "/ending":
            self._send_file(OVERLAY_DIR / "ending.html", "text/html; charset=utf-8")
        elif route == "/creditsroll":
            self._send_file(OVERLAY_DIR / "credits.html", "text/html; charset=utf-8")
        elif route == "/stage":
            self._send_file(OVERLAY_DIR / "livelisten.html", "text/html; charset=utf-8")
        elif route == "/theme.css":
            self._send_file(OVERLAY_DIR / "theme.css", "text/css; charset=utf-8")
        elif route == "/state":
            with _lock:
                # Credits must ride along here too, not only on the SSE
                # broadcast - an overlay loading fresh would otherwise show an
                # empty roll until something unrelated triggered an update.
                payload = dict(_state)
                payload["credits"] = _credits
                payload["startup"] = _startup
                payload["rvb"] = _rvb_payload()
                body = json.dumps(payload).encode()
            self._send(body, "application/json")
        elif route.startswith("/assets/"):
            # Path().name strips any directory part, so a crafted URL cannot
            # walk out of the assets folder.
            name = Path(route[len("/assets/"):]).name
            ctype = {
                ".png": "image/png", ".svg": "image/svg+xml",
                ".webp": "image/webp", ".jpg": "image/jpeg",
                ".jpeg": "image/jpeg", ".gif": "image/gif",
            }.get(Path(name).suffix.lower(), "application/octet-stream")
            self._send_file(ASSET_DIR / name, ctype)
        elif route == "/file":
            # Serve one local image by full path, so a theme's logo can live
            # anywhere on disk (like the bg files) instead of only in
            # overlays/assets. Images only - this is not a general file
            # server; anything else 404s.
            qs = parse_qs(urlparse(self.path).query)
            path = Path((qs.get("path") or [""])[0])
            media_ct = {".png": "image/png", ".svg": "image/svg+xml",
                        ".webp": "image/webp", ".jpg": "image/jpeg",
                        ".jpeg": "image/jpeg", ".gif": "image/gif",
                        # Videos too: alert overlays pull effect footage
                        # (e.g. the raid fire) through here.
                        ".webm": "video/webm", ".mp4": "video/mp4",
                        ".mov": "video/quicktime"}
            ctype = media_ct.get(path.suffix.lower())
            if ctype and path.is_file():
                self._send_file(path, ctype)
            else:
                self._send(b"not found", "text/plain", 404)
        elif route == "/files":
            # What the panel's asset pickers can offer: web-served logo
            # images, and OBS-playable media for the [BG] video slot.
            img_ext = {".png", ".svg", ".webp", ".jpg", ".jpeg", ".gif"}
            vid_ext = {".mp4", ".mov", ".webm", ".mkv"}
            media_dir = ROOT / "media"
            out = {
                "assets": sorted(p.name for p in ASSET_DIR.glob("*")
                                 if p.suffix.lower() in img_ext),
                "media": sorted(str(p).replace("\\", "/")
                                for p in media_dir.glob("*")
                                if p.suffix.lower() in vid_ext),
            }
            self._send(json.dumps(out).encode(), "application/json")
        elif route == "/slots":
            with _lock:
                body = json.dumps(_slots).encode()
            self._send(body, "application/json")
        elif route == "/events":
            self._stream_events()
        else:
            self._send(b"not found", "text/plain", 404)

    def do_POST(self) -> None:
        route = self.path.split("?", 1)[0].rstrip("/")
        if route == "/slots":
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._send(b'{"error":"bad json"}', "application/json", 400)
                return
            key, rects = body.get("key"), body.get("slots")
            if isinstance(key, str) and isinstance(rects, dict):
                with _lock:
                    _slots[key] = rects
            self._send(b'{"ok":true}', "application/json")
            return
        if route == "/audio/swap":
            # Show-mode toggle: state A = Audience + Mic/Aux live, Show muted
            # (normal talking). One press flips to state B = Show live,
            # everything else muted (episode playback). Press again to return.
            # The flip direction is read from OBS each press, so it cannot
            # drift out of sync with reality.
            link = _obs["link"]
            if link is None:
                self._send(b'{"error":"obs link not up"}',
                           "application/json", 503)
                return
            link.swap_audio(live_in_a=["Audience", "Mic/Aux"],
                            muted_in_a=["Show"])
            self._send(b'{"ok":true}', "application/json")
            return
        if route == "/effect/threshold":
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                body = {}
            self._send(json.dumps(fire_threshold(body.get("seconds"))).encode(),
                       "application/json")
            return
        if route == "/effect/threshold/off":
            self._send(json.dumps(clear_threshold()).encode(), "application/json")
            return
        if route == "/rvb/peek":
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                body = {}
            self._send(json.dumps(rvb_peek(body.get("seconds"))).encode(),
                       "application/json")
            return
        if route == "/rvb/gate":
            # Team-gated redeems: Firebot posts {"user": "...", "effect": "..."}
            # and the effect only fires if that user is on the LEADING team.
            # Answers 200 either way with {"allowed": bool} so Firebot can
            # branch on it and tell the viewer why nothing happened.
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                body = {}
            self._send(json.dumps(rvb_gate(
                str(body.get("user", "")), str(body.get("effect", "")),
                body.get("seconds"))).encode(), "application/json")
            return
        if route == "/rvb/reset":
            # DRAFT NIGHT. Wipes the roster and the scores - explicit only,
            # never automatic, same discipline as /credits/reset.
            if _teams is None:
                self._send(b'{"error":"rvb disabled"}', "application/json", 503)
                return
            self._send(json.dumps(_teams.reset_month()).encode(),
                       "application/json")
            return
        if route == "/rvb/attendance/reset":
            if _teams is None:
                self._send(b'{"error":"rvb disabled"}', "application/json", 503)
                return
            _teams.reset_attendance()
            self._send(b'{"ok":true}', "application/json")
            return
        if route == "/effect/micfx":
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                body = {}
            self._send(json.dumps(fire_micfx(body.get("seconds"))).encode(),
                       "application/json")
            return
        if route == "/effect/micfx/off":
            self._send(json.dumps(clear_micfx()).encode(), "application/json")
            return
        if route == "/dev/startup":
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                body = {}
            action = body.get("action")
            if action == "end":
                startup_end()
            elif action == "videoend":
                # The full handoff, scene switch included.
                do_video_end(_obs["starting_video"])
            else:
                do_stream_start()
            with _lock:
                out = json.dumps(dict(_startup)).encode()
            self._send(out, "application/json")
            return
        if route == "/dev/simulate":
            # Replay a raw IRC line through the real parser. Localhost only,
            # and it writes to the same credits store the live reader does -
            # so run /credits/reset afterwards before going live.
            length = int(self.headers.get("Content-Length") or 0)
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self._send(b'{"error":"bad json"}', "application/json", 400)
                return
            lines = body.get("lines") or ([body["line"]] if body.get("line") else [])
            for ln in lines:
                simulate_line(ln)
            with _lock:
                out = json.dumps({"replayed": len(lines), "credits": _credits})
            self._send(out.encode(), "application/json")
            return
        if route == "/credits/reset":
            # Explicit only. Never automatic - a crash-restart mid-stream must
            # not silently wipe the subscriber list.
            self._send(json.dumps(reset_credits()).encode(), "application/json")
            return
        if route == "/reset":
            # Back to the show's standing defaults, not to empty - but themes
            # and the selected show survive. A custom show's palette is hours
            # of tuning; "Reset to defaults" must never be able to delete it.
            fresh = dict(DEFAULT_STATE)
            with _lock:
                fresh["themes"] = json.loads(json.dumps(_state["themes"]))
                fresh["show"] = _state["show"]
            self._send(json.dumps(update_state(fresh)).encode(),
                       "application/json")
            return
        if route != "/state":
            self._send(b"not found", "text/plain", 404)
            return
        length = int(self.headers.get("Content-Length") or 0)
        try:
            patch = json.loads(self.rfile.read(length) or b"{}")
        except json.JSONDecodeError:
            self._send(b'{"error":"bad json"}', "application/json", 400)
            return
        snapshot = update_state(patch if isinstance(patch, dict) else {})
        self._send(json.dumps(snapshot).encode(), "application/json")

    def _stream_events(self) -> None:
        q: queue.Queue = queue.Queue(maxsize=16)
        with _lock:
            _listeners.append(q)
            snapshot = dict(_state)

        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Connection", "keep-alive")
        self.end_headers()

        try:
            self.wfile.write(f"data: {json.dumps(snapshot)}\n\n".encode())
            self.wfile.flush()
            while True:
                try:
                    item = q.get(timeout=15)
                    payload = f"data: {json.dumps(item)}\n\n"
                except queue.Empty:
                    # Comment frame - keeps OBS's browser source from dropping
                    # an idle connection during a long stream.
                    payload = ": keepalive\n\n"
                self.wfile.write(payload.encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, OSError):
            pass
        finally:
            with _lock:
                if q in _listeners:
                    _listeners.remove(q)


# Populated in main(). Module level so /dev/ endpoints can run exactly the
# same handlers the live OBS events do - a simulation that skips half the
# work proves nothing.
_obs: dict = {"link": None, "starting_scene": "Starting Soon",
              "starting_video": "Start Video", "live_scene": "Live",
              "auto_switch": True}


_effect_timer = None


def fire_threshold(seconds: float | None = None) -> dict:
    """Flip the whole stream to black/#FFF200 for a while, then back.

    Auto-reverts on a timer. A redeem that toggles permanently means somebody
    has to notice and undo it, and if it gets missed the stream stays wrong -
    so the revert is unconditional and does not depend on a second request.
    """
    global _effect_timer
    cfg = {k: v for k, v in _load_cfg().get("threshold_effect", {}).items()
           if not k.startswith("_")}
    name = cfg.get("filter_name", "Threshold Yellow")
    scenes = cfg.get("scenes", [])
    secs = float(seconds if seconds is not None else cfg.get("seconds", 30))
    link = _obs["link"]

    if link is None:
        return {"ok": False, "error": "not connected to OBS"}

    for scene in scenes:
        link.set_filter_enabled(scene, name, True)

    # Restart the clock if it is redeemed again mid-effect, rather than
    # letting the first timer cut the second redeem short.
    if _effect_timer is not None:
        _effect_timer.cancel()

    def revert():
        for scene in scenes:
            link.set_filter_enabled(scene, name, False)
        print("  [fx] threshold off", flush=True)

    _effect_timer = threading.Timer(secs, revert)
    _effect_timer.daemon = True
    _effect_timer.start()
    print(f"  [fx] threshold ON for {secs:g}s across {len(scenes)} scenes",
          flush=True)
    return {"ok": True, "seconds": secs, "scenes": scenes, "filter": name}


_peek_timer = None


def rvb_peek(seconds: float | None = None) -> dict:
    """Show the score bar for a few seconds, then hide it again.

    Same unconditional-revert discipline as the other effects: a redeem
    that leaves the bar up forever is a redeem somebody has to clean up.
    """
    global _peek_timer
    if _teams is None:
        return {"ok": False, "error": "rvb disabled"}
    secs = float(seconds if seconds is not None else 6)
    update_state({"scorePeek": True})
    if _peek_timer is not None:
        _peek_timer.cancel()

    def hide():
        update_state({"scorePeek": False})

    _peek_timer = threading.Timer(secs, hide)
    _peek_timer.daemon = True
    _peek_timer.start()
    return {"ok": True, "seconds": secs, **_teams.snapshot()}


def rvb_gate(user: str, effect: str, seconds=None) -> dict:
    """Run an effect only if `user` is on the currently leading team.

    Always answers 200 with an `allowed` flag rather than an error status:
    a viewer being on the wrong team is a normal outcome of the game, not
    a failure, and Firebot needs to branch on it to say so in chat.
    """
    if _teams is None:
        return {"allowed": False, "reason": "rvb disabled"}
    user = (user or "").strip().lower().lstrip("@")
    snap = _teams.snapshot()
    lead = snap.get("lead")
    team = _teams.team_of(user)
    if not lead:
        return {"allowed": False, "reason": "tied", "team": team, "lead": lead}
    if team != lead:
        return {"allowed": False, "reason": "not on the leading team",
                "team": team, "lead": lead}
    runners = {"threshold": fire_threshold, "micfx": fire_micfx}
    fn = runners.get(effect)
    if fn is None:
        return {"allowed": True, "ran": None, "team": team, "lead": lead,
                "reason": f"unknown effect {effect!r}"}
    return {"allowed": True, "ran": effect, "team": team, "lead": lead,
            "result": fn(seconds)}


_micfx_timer = None


def fire_micfx(seconds: float | None = None) -> dict:
    """Enable the mic's 3-Band Equalizer (the radio-voice EQ) for a while.

    Same shape as the threshold redeem: auto-reverts on an unconditional
    timer, and a re-redeem mid-effect restarts the clock instead of being
    cut short by the first timer.
    """
    global _micfx_timer
    secs = float(seconds if seconds is not None else 15)
    link = _obs["link"]
    if link is None:
        return {"ok": False, "error": "not connected to OBS"}

    link.set_filter_enabled("Mic/Aux", "3-Band Equalizer", True)
    if _micfx_timer is not None:
        _micfx_timer.cancel()

    def revert():
        link.set_filter_enabled("Mic/Aux", "3-Band Equalizer", False)
        print("  [fx] mic EQ off", flush=True)

    _micfx_timer = threading.Timer(secs, revert)
    _micfx_timer.daemon = True
    _micfx_timer.start()
    print(f"  [fx] mic EQ ON for {secs:g}s", flush=True)
    return {"ok": True, "seconds": secs}


def clear_micfx() -> dict:
    """Panic off - kill it immediately regardless of the timer."""
    global _micfx_timer
    link = _obs["link"]
    if _micfx_timer is not None:
        _micfx_timer.cancel()
        _micfx_timer = None
    if link is None:
        return {"ok": False, "error": "not connected to OBS"}
    link.set_filter_enabled("Mic/Aux", "3-Band Equalizer", False)
    return {"ok": True}


def clear_threshold() -> dict:
    """Panic off - kill it immediately regardless of the timer."""
    global _effect_timer
    cfg = {k: v for k, v in _load_cfg().get("threshold_effect", {}).items()
           if not k.startswith("_")}
    link = _obs["link"]
    if _effect_timer is not None:
        _effect_timer.cancel()
        _effect_timer = None
    if link is None:
        return {"ok": False, "error": "not connected to OBS"}
    for scene in cfg.get("scenes", []):
        link.set_filter_enabled(scene, cfg.get("filter_name", "Threshold Yellow"),
                                False)
    return {"ok": True}


# The lamp colour currently being streamed, so a lead that holds steady
# does not relaunch the streamer on every single point scored.
_lamp_lead = None


def _lamps_to_team(force: bool = False) -> None:
    """Standing lamps wear the leading team's colour while they hold it.

    Physical territory: whoever holds the broadcast holds the room. Fires
    only when the LEAD CHANGES (or on force, at stream start). Skipped on a
    tie - nobody has taken anything yet. Launched detached, because
    lan_hold streams colour forever and must outlive this call.
    """
    global _lamp_lead
    if _teams is None:
        return
    cfg = _rvb_cfg()
    if not cfg.get("lamps", {}).get("enabled"):
        return
    snap = _teams.snapshot()
    lead = snap.get("lead")
    if not lead:
        return
    if lead == _lamp_lead and not force:
        return
    hexval = (snap.get("leadColor") or "").lstrip("#")
    if len(hexval) != 6:
        return
    _lamp_lead = lead
    r, g, b = (int(hexval[i:i + 2], 16) for i in (0, 2, 4))
    lamps = cfg.get("lamps", {})
    ips = lamps.get("stream_ips", "")
    once = lamps.get("once_ips", "")
    script = ROOT / "lights" / "lan_hold.py"
    if not ips or not script.exists():
        return
    args = [sys.executable, str(script), ips, str(r), str(g), str(b)]
    if once:
        # Healthy units take one ordinary command; only the stuck pair needs
        # the continuous stream.
        args += ["--once", once]
    try:
        subprocess.Popen(
            args,
            cwd=str(script.parent),
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print(f"  [rvb] lamps -> {snap['lead'].upper()} ({r},{g},{b})", flush=True)
    except OSError as exc:
        print(f"  [rvb] lamp launch failed: {exc}", flush=True)


def do_stream_start() -> None:
    """Going live: clear the credits, arm the counter, show the countdown."""
    reset_credits()
    startup_begin()
    if _teams is not None:
        # New stream, fresh attendance - teams and points carry over, but
        # who turned up tonight starts empty.
        _teams.reset_attendance()
    _lamps_to_team(force=True)
    link = _obs["link"]
    if link is not None:
        # Re-show the video; it hides itself at the end of the last run.
        link.set_item_enabled(_obs["starting_scene"], _obs["starting_video"], True)
    print("  [obs] credits cleared, counter armed, countdown re-shown", flush=True)


def do_video_end(ended: str) -> None:
    """The countdown finished: hand over to the live scene."""
    if ended != _obs["starting_video"]:
        return                                   # some other media source
    startup_end()
    print(f"  [obs] {ended!r} finished - {_startup['count']} chats "
          f"(record {_startup['record']})", flush=True)
    if not _obs["auto_switch"]:
        return
    link = _obs["link"]
    if link is not None:
        link.set_scene(_obs["live_scene"])
        # Hide it so OBS restarts it from the top next stream.
        link.set_item_enabled(_obs["starting_scene"], _obs["starting_video"], False)


def main() -> int:
    cfg_path = ROOT / "config.json"
    cfg = json.loads(cfg_path.read_text(encoding="utf-8")).get("control_panel", {})
    local = ROOT / "config.local.json"
    if local.exists():
        cfg.update(json.loads(local.read_text(encoding="utf-8")).get("control_panel", {}))

    ap = argparse.ArgumentParser()
    ap.add_argument("--host", default=cfg.get("host", "127.0.0.1"))
    ap.add_argument("--port", type=int, default=cfg.get("port", 8722))
    args = ap.parse_args()

    load_state()
    load_credits()
    load_record()

    # Chat starts empty every session - resurrecting yesterday's messages on
    # stream would be worse than an empty panel.
    with _lock:
        _state["messages"] = []

    rvb_cfg = {k: v for k, v in _load_cfg().get("rvb", {}).items()
               if not k.startswith("_")}
    if rvb_cfg.get("enabled"):
        global _teams, _fb
        fb_cfg = rvb_cfg.get("firebot", {})
        if fb_cfg.get("enabled"):
            _fb = Firebot(host=fb_cfg.get("host", "127.0.0.1"),
                          port=int(fb_cfg.get("port", 7472)))
            print(f"  Firebot bridge: {'up' if _fb.available() else 'not answering (chat lines will no-op)'}")
        _teams = Teams(rvb_cfg, on_change=_broadcast, on_draft=announce_draft)
        snap = _teams.snapshot()
        print(f"  RED VS BLUE   : {snap['month']}  "
              f"red {snap['red']} / blue {snap['blue']}  "
              f"({snap['counts']['red']}v{snap['counts']['blue']} members)")

    tw = _twitch_cfg()
    if tw.get("enabled") and tw.get("channel"):
        TwitchChat(
            channel=tw["channel"],
            on_message=push_message,
            on_clear_user=lambda user: drop_messages(lambda m: m.get("user") == user),
            on_clear_msg=lambda mid: drop_messages(lambda m: m.get("id") == mid),
            on_clear_all=lambda: drop_messages(lambda m: True),
            on_sub=add_sub,
            on_bits=add_bits,
        ).start()
    else:
        print("  Twitch chat   : disabled (see config.json -> twitch)")

    obs_cfg = {k: v for k, v in _load_cfg().get("obs_watch", {}).items()
               if not k.startswith("_")}
    if obs_cfg.get("enabled"):
        _obs["starting_scene"] = obs_cfg.get("starting_scene", "Starting Soon")
        _obs["starting_video"] = obs_cfg.get("starting_video", "Start Video")
        _obs["live_scene"] = obs_cfg.get("live_scene", "Live")
        _obs["auto_switch"] = bool(obs_cfg.get("auto_switch_on_video_end", True))

        link = ObsLink(
            host=obs_cfg.get("host", "127.0.0.1"),
            port=int(obs_cfg.get("port", 4455)),
            password=obs_cfg.get("password", ""),
            on_stream_start=do_stream_start,
            on_video_end=do_video_end,
        )
        _obs["link"] = link
        link.start()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.daemon_threads = True

    print(f"\n  Control panel : http://{args.host}:{args.port}/")
    print(f"  OBS overlay   : http://{args.host}:{args.port}/overlay")
    print("\n  Leave this window open while you stream. Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("  stopped.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
