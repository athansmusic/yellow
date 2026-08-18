"""Fan-art pipeline: Tumblr tag -> approval queue -> BRB gallery.

Anyone posts art to Tumblr tagged with the show's tag. This module polls
the public tagged endpoint, and every new image post lands here as
PENDING. Nothing reaches the stream unapproved: the owner works the
/artqueue portal (A approve / X reject / U undo), and only APPROVED
pieces are served to the BRB scene - the 30 most recent, which the page
shuffles client-side.

Needs a Tumblr API key (free): https://www.tumblr.com/oauth/apps ->
register an application -> use the "OAuth Consumer Key". Then in
config.local.json:

    { "tumblr": { "api_key": "THE_KEY" } }

No key = polling quietly off; the queue still works for entries added
by hand (POST /art/submit, for testing or non-Tumblr one-offs).
"""
from __future__ import annotations

import json
import re
import threading
import time
import urllib.parse
import urllib.request
from pathlib import Path

# No filter param: filter=text would strip the body HTML, and modern
# (NPF) posts carry their images as <img> tags inside exactly that HTML.
TAGGED_URL = "https://api.tumblr.com/v2/tagged?tag={tag}&api_key={key}"


class ArtQueue:
    def __init__(self, store: Path, cfg: dict):
        self.store = store
        self.tag = cfg.get("tag", "the redacted unit")
        self.api_key = (cfg.get("api_key") or "").strip()
        self.poll_seconds = max(60, int(cfg.get("poll_seconds", 120)))
        self._lock = threading.Lock()
        self._undo: list[tuple[str, str]] = []   # (id, previous status)
        self._items: list[dict] = []
        self._load()
        if self.api_key:
            threading.Thread(target=self._poll_loop, daemon=True).start()

    # ---- store ----------------------------------------------------------
    def _load(self) -> None:
        if self.store.exists():
            try:
                self._items = json.loads(self.store.read_text(encoding="utf-8"))
            except (json.JSONDecodeError, OSError):
                self._items = []

    def _save(self) -> None:
        try:
            self.store.write_text(json.dumps(self._items, indent=1),
                                  encoding="utf-8")
        except OSError:
            pass

    # ---- tumblr ---------------------------------------------------------
    def _poll_loop(self) -> None:
        while True:
            try:
                self._poll_once()
            except Exception:                              # noqa: BLE001
                pass          # one bad poll must never kill the thread
            time.sleep(self.poll_seconds)

    def _poll_once(self) -> None:
        url = TAGGED_URL.format(tag=urllib.parse.quote(self.tag),
                                key=self.api_key)
        with urllib.request.urlopen(url, timeout=15) as r:
            posts = json.loads(r.read()).get("response", [])
        added = 0
        for p in posts:
            image, w, h = self._image_of(p)
            if not image:
                continue
            pid = str(p.get("id_string") or p.get("id") or "")
            if not pid:
                continue
            with self._lock:
                if any(i["id"] == pid for i in self._items):
                    continue
                title = (p.get("summary") or "").strip().splitlines()[0][:80] \
                    if (p.get("summary") or "").strip() else "untitled"
                self._items.append({
                    "id": pid,
                    "image": image,
                    "width": w, "height": h,
                    "title": title,
                    "artist": p.get("blog_name", "unknown"),
                    "post_url": p.get("post_url", ""),
                    "ts": int(p.get("timestamp") or time.time()),
                    "notes": int(p.get("note_count") or 0),
                    "status": "pending",
                })
                added += 1
        if added:
            with self._lock:
                # newest first, cap the store so it never grows unbounded
                self._items.sort(key=lambda i: i["ts"], reverse=True)
                del self._items[400:]
                self._save()

    @staticmethod
    def _image_of(post: dict):
        """First image of a post, or (None, 0, 0).

        Legacy photo posts carry a photos[] array, but modern Tumblr
        (NPF) serves nearly everything as type "text" with the image as
        an <img> inside the body HTML - checked live 2026-08-18: 19 of
        20 posts under the show tag were text posts. Only tumblr's own
        media CDN counts; an external hotlink in a reblog does not.
        """
        photos = post.get("photos") or []
        if photos:
            orig = (photos[0].get("original_size") or {})
            return orig.get("url"), orig.get("width", 0), orig.get("height", 0)
        for m in re.finditer(r'<img[^>]+src="([^"]+)"[^>]*>',
                             post.get("body") or ""):
            url = m.group(1)
            if "media.tumblr.com" not in url:
                continue
            # (Do NOT rewrite the /sWxH/ path segment for a bigger
            # rendition - the CDN signs URLs per size and 404s any other.
            # 640px in the 660px frame is a negligible upscale.)
            tag = m.group(0)
            w = re.search(r'data-orig-width="(\d+)"', tag)
            h = re.search(r'data-orig-height="(\d+)"', tag)
            return url, int(w.group(1)) if w else 0, int(h.group(1)) if h else 0
        return None, 0, 0

    # ---- queue operations ----------------------------------------------
    def pending(self) -> list[dict]:
        with self._lock:
            return [dict(i) for i in self._items if i["status"] == "pending"]

    def approved(self, limit: int = 30) -> list[dict]:
        with self._lock:
            ok = [dict(i) for i in self._items if i["status"] == "approved"]
        ok.sort(key=lambda i: i["ts"], reverse=True)
        return ok[:limit]

    def decide(self, item_id: str, action: str) -> dict:
        if action == "undo":
            return self._undo_last()
        if action not in ("approve", "reject"):
            return {"error": "unknown action"}
        with self._lock:
            for i in self._items:
                if i["id"] == str(item_id):
                    self._undo.append((i["id"], i["status"]))
                    del self._undo[:-20]
                    i["status"] = "approved" if action == "approve" else "rejected"
                    self._save()
                    return {"ok": True, "id": i["id"], "status": i["status"]}
        return {"error": "no such item"}

    def _undo_last(self) -> dict:
        with self._lock:
            while self._undo:
                item_id, prev = self._undo.pop()
                for i in self._items:
                    if i["id"] == item_id:
                        i["status"] = prev
                        self._save()
                        return {"ok": True, "id": item_id, "status": prev}
        return {"error": "nothing to undo"}

    def submit(self, entry: dict) -> dict:
        """Manual entry - testing, or art that never touched Tumblr."""
        image = (entry.get("image") or "").strip()
        if not image:
            return {"error": "image url required"}
        with self._lock:
            pid = entry.get("id") or f"manual-{int(time.time() * 1000)}"
            if any(i["id"] == pid for i in self._items):
                return {"error": "duplicate id"}
            self._items.insert(0, {
                "id": pid, "image": image, "width": 0, "height": 0,
                "title": (entry.get("title") or "untitled")[:80],
                "artist": entry.get("artist") or "unknown",
                "post_url": entry.get("post_url") or "",
                # Trust a supplied timestamp (the backfill passes the real
                # post date); stamp "now" only for true one-offs.
                "ts": int(entry.get("ts") or time.time()), "notes": 0,
                "status": "pending",
            })
            self._save()
        return {"ok": True, "id": pid}
