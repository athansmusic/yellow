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
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

from twitch_chat import TwitchChat

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
STATE_FILE = HERE / "state.json"
OVERLAY_DIR = ROOT / "overlays"

DEFAULT_STATE = {
    # Which Live Listen layout the stage renders.
    "scene": "two",             # "two" | "solo"

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

    # No viewerCount field. Nothing feeds it, so it could only ever display
    # a number somebody typed - i.e. a wrong one, live on stream.
    "messages": [],             # [{name, text, badge, nameColor}] - newest last
    "alertName": "",
    "alertMeta": "",

    # Legacy lower-third overlay (overlays/episode.html)
    "episode": "",
    "title": "",
    "guest": "",
    "visible": False,
}

_lock = threading.Lock()
_state: dict = dict(DEFAULT_STATE)
_listeners: list[queue.Queue] = []


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
        except (json.JSONDecodeError, OSError):
            # A corrupt state file must never stop the stream from starting.
            _state = dict(DEFAULT_STATE)


def save_state() -> None:
    try:
        STATE_FILE.write_text(json.dumps(_state, indent=2), encoding="utf-8")
    except OSError:
        pass


def push_message(msg: dict) -> None:
    """Append a chat line and drop the oldest beyond the cap."""
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


def _broadcast() -> None:
    with _lock:
        snapshot = dict(_state)
        save_state()
        dead = []
        for q in _listeners:
            try:
                q.put_nowait(snapshot)
            except queue.Full:
                dead.append(q)
        for q in dead:
            _listeners.remove(q)


def update_state(patch: dict) -> dict:
    with _lock:
        for k in DEFAULT_STATE:
            if k in patch:
                _state[k] = patch[k]
        snapshot = dict(_state)
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
        elif route == "/stage":
            self._send_file(OVERLAY_DIR / "livelisten.html", "text/html; charset=utf-8")
        elif route == "/theme.css":
            self._send_file(OVERLAY_DIR / "theme.css", "text/css; charset=utf-8")
        elif route == "/state":
            with _lock:
                body = json.dumps(_state).encode()
            self._send(body, "application/json")
        elif route == "/events":
            self._stream_events()
        else:
            self._send(b"not found", "text/plain", 404)

    def do_POST(self) -> None:
        route = self.path.split("?", 1)[0].rstrip("/")
        if route == "/reset":
            # Back to the show's standing defaults, not to empty.
            self._send(json.dumps(update_state(dict(DEFAULT_STATE))).encode(),
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

    # Chat starts empty every session - resurrecting yesterday's messages on
    # stream would be worse than an empty panel.
    with _lock:
        _state["messages"] = []

    tw = _twitch_cfg()
    if tw.get("enabled") and tw.get("channel"):
        TwitchChat(
            channel=tw["channel"],
            on_message=push_message,
            on_clear_user=lambda user: drop_messages(lambda m: m.get("user") == user),
            on_clear_msg=lambda mid: drop_messages(lambda m: m.get("id") == mid),
            on_clear_all=lambda: drop_messages(lambda m: True),
        ).start()
    else:
        print("  Twitch chat   : disabled (see config.json -> twitch)")

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
