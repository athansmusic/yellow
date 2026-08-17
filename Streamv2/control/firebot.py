"""Trigger Firebot preset effect lists over its local HTTP API.

This process reads Twitch anonymously and holds no token, so anything that
has to appear IN CHAT goes out through Firebot, which is the one component
actually authenticated as the broadcaster.

Lists are looked up by NAME, not id: ids are UUIDs that change whenever a
list is recreated, and nobody should have to paste one into a config file.
The resolved id is cached, and re-resolved automatically if it goes stale.

Every send is fire-and-forget on a thread - Firebot being closed, slow, or
mid-restart must never block the chat parser or delay a draft.
"""
from __future__ import annotations

import json
import threading
import urllib.error
import urllib.request


class Firebot:
    def __init__(self, host: str = "127.0.0.1", port: int = 7472,
                 log=print):
        self.base = f"http://{host}:{port}/api/v1"
        self.log = log
        self._ids: dict[str, str] = {}
        self._lock = threading.Lock()

    # -- plumbing ---------------------------------------------------------
    def _get(self, path: str, timeout: float = 3.0):
        with urllib.request.urlopen(self.base + path, timeout=timeout) as r:
            return json.loads(r.read() or b"null")

    def _post(self, path: str, payload: dict, timeout: float = 3.0):
        req = urllib.request.Request(
            self.base + path, data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status

    def available(self) -> bool:
        try:
            self._get("/status", timeout=2.0)
            return True
        except (urllib.error.URLError, OSError, ValueError):
            return False

    # -- preset effect lists ---------------------------------------------
    def _resolve(self, name: str, refresh: bool = False) -> str | None:
        with self._lock:
            if not refresh and name in self._ids:
                return self._ids[name]
        try:
            lists = self._get("/effects/preset") or []
        except (urllib.error.URLError, OSError, ValueError):
            return None
        found = None
        for item in lists:
            if str(item.get("name", "")).strip().lower() == name.strip().lower():
                found = item.get("id")
                break
        with self._lock:
            if found:
                self._ids[name] = found
            else:
                self._ids.pop(name, None)
        return found

    def run_preset(self, name: str, args: dict | None = None) -> None:
        """Fire a preset effect list by name. Never raises, never blocks."""
        threading.Thread(target=self._run_preset_worker,
                         args=(name, dict(args or {})), daemon=True).start()

    def _run_preset_worker(self, name: str, args: dict) -> None:
        pid = self._resolve(name)
        if not pid:
            self.log(f"  [firebot] no preset effect list named {name!r} "
                     f"- create it in Firebot to enable this")
            return
        body = {"args": args}
        try:
            self._post(f"/effects/preset/{pid}", body)
            return
        except (urllib.error.URLError, OSError, ValueError):
            pass
        # A cached id can go stale if the list was recreated - retry once.
        pid = self._resolve(name, refresh=True)
        if not pid:
            return
        try:
            self._post(f"/effects/preset/{pid}", body)
        except (urllib.error.URLError, OSError, ValueError) as exc:
            self.log(f"  [firebot] {name!r} failed: {type(exc).__name__}")
