"""Read-only Twitch chat reader for the Live Listen stage.

Connects anonymously. Twitch allows any client to join a public channel's chat
as `justinfan<n>` with no password, so this holds NO credentials and can only
read - it cannot post, moderate, or touch the account in any way.

Handles moderation events, which matters for a live overlay: if a mod deletes a
message or times somebody out, it disappears from the stage instead of sitting
frozen on screen.

Stdlib only.
"""

from __future__ import annotations

import random
import re
import socket
import ssl
import threading
import time

HOST = "irc.chat.twitch.tv"
PORT = 6697

# Most specific badge wins - a mod who is also a sub reads as "mod".
BADGE_PRIORITY = (
    ("broadcaster", "host"),
    ("moderator", "mod"),
    ("vip", "vip"),
    ("founder", "sub"),
    ("subscriber", "sub"),
)

_LINE = re.compile(
    r"^(?:@(?P<tags>[^ ]*) )?"
    r"(?::(?P<prefix>[^ ]+) )?"
    r"(?P<cmd>[A-Z]+|\d{3})"
    r"(?P<params>[^:]*)"
    r"(?::(?P<trailing>.*))?$"
)


def _parse_tags(raw: str) -> dict:
    tags = {}
    for part in (raw or "").split(";"):
        if not part:
            continue
        k, _, v = part.partition("=")
        # IRCv3 escaping
        tags[k] = (v.replace(r"\s", " ").replace(r"\:", ";")
                    .replace(r"\r", "").replace(r"\n", "").replace("\\\\", "\\"))
    return tags


def _fragments(text: str, emotes_tag: str) -> list[dict]:
    """Split a message into text runs and emote images.

    Twitch gives emote positions in the `emotes` tag as
    `id:start-end,start-end/id:start-end`, indexed by CODE POINT. Python
    strings index by code point too, so the slices line up directly - which
    is exactly where a JavaScript implementation would go wrong, because JS
    indexes UTF-16 and any emoji earlier in the line shifts every position.
    """
    if not emotes_tag:
        return [{"t": "text", "v": text}] if text else []

    spans: list[tuple[int, int, str]] = []
    for group in emotes_tag.split("/"):
        if not group or ":" not in group:
            continue
        emote_id, _, ranges = group.partition(":")
        for rng in ranges.split(","):
            start, _, end = rng.partition("-")
            try:
                spans.append((int(start), int(end), emote_id))
            except ValueError:
                continue
    if not spans:
        return [{"t": "text", "v": text}] if text else []

    spans.sort()
    chars = list(text)
    out: list[dict] = []
    cursor = 0
    for start, end, emote_id in spans:
        if start < cursor or end >= len(chars):
            continue                              # overlapping or stale index
        if start > cursor:
            out.append({"t": "text", "v": "".join(chars[cursor:start])})
        out.append({"t": "emote", "id": emote_id,
                    "v": "".join(chars[start:end + 1])})
        cursor = end + 1
    if cursor < len(chars):
        out.append({"t": "text", "v": "".join(chars[cursor:])})
    return out


def _badge_of(tags: dict) -> str:
    badges = tags.get("badges", "")
    have = {b.split("/")[0] for b in badges.split(",") if b}
    for key, label in BADGE_PRIORITY:
        if key in have:
            return label
    return ""


class TwitchChat(threading.Thread):
    """Streams chat events to callbacks. Reconnects on its own."""

    daemon = True

    def __init__(self, channel: str, on_message, on_clear_user, on_clear_msg,
                 on_clear_all, on_sub=None, on_bits=None,
                 # flush, or nothing appears until the process exits
                 log=lambda *a: print(*a, flush=True)):
        super().__init__(name="twitch-chat")
        self.channel = channel.lstrip("#").lower()
        self.on_message = on_message
        self.on_clear_user = on_clear_user
        self.on_clear_msg = on_clear_msg
        self.on_clear_all = on_clear_all
        self.on_sub = on_sub or (lambda e: None)
        self.on_bits = on_bits or (lambda e: None)
        self.log = log
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def run(self) -> None:
        backoff = 2
        while not self._stop.is_set():
            try:
                self._session()
                backoff = 2                      # clean disconnect, retry soon
            except Exception as exc:             # noqa: BLE001 - never die
                self.log(f"  [chat] {type(exc).__name__}: {exc}")
            if self._stop.is_set():
                break
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    def _session(self) -> None:
        ctx = ssl.create_default_context()
        with socket.create_connection((HOST, PORT), timeout=20) as raw:
            with ctx.wrap_socket(raw, server_hostname=HOST) as sock:
                sock.settimeout(340)             # Twitch pings ~every 5 min
                nick = f"justinfan{random.randint(10000, 99999)}"
                sock.sendall(b"CAP REQ :twitch.tv/tags twitch.tv/commands\r\n")
                sock.sendall(f"NICK {nick}\r\n".encode())
                sock.sendall(f"JOIN #{self.channel}\r\n".encode())
                self.log(f"  [chat] connected to #{self.channel} as {nick}")

                buf = b""
                while not self._stop.is_set():
                    chunk = sock.recv(8192)
                    if not chunk:
                        raise ConnectionError("connection closed by Twitch")
                    buf += chunk
                    while b"\r\n" in buf:
                        line, buf = buf.split(b"\r\n", 1)
                        self._handle(sock, line.decode("utf-8", "replace"))

    def _handle(self, sock, line: str) -> None:
        if not line:
            return
        if line.startswith("PING"):
            sock.sendall(b"PONG :tmi.twitch.tv\r\n")
            return

        m = _LINE.match(line)
        if not m:
            return
        cmd = m.group("cmd")
        tags = _parse_tags(m.group("tags"))
        trailing = m.group("trailing") or ""
        params = (m.group("params") or "").split()

        if cmd == "PRIVMSG":
            prefix = m.group("prefix") or ""
            nick = prefix.split("!", 1)[0]
            # Bits ride on a normal chat message, not USERNOTICE.
            if tags.get("bits"):
                try:
                    amount = int(tags["bits"])
                except ValueError:
                    amount = 0
                if amount > 0:
                    self.on_bits({
                        "user": nick.lower(),
                        "name": tags.get("display-name") or nick,
                        "bits": amount,
                        "message": trailing,
                    })
            self.on_message({
                "id": tags.get("id", ""),
                "user": nick.lower(),
                "name": tags.get("display-name") or nick,
                "text": trailing,
                "parts": _fragments(trailing, tags.get("emotes", "")),
                "badge": _badge_of(tags),
                "color": tags.get("color", ""),
            })

        elif cmd == "CLEARCHAT":
            # With a target: that user was banned or timed out. Without: chat
            # was wiped wholesale.
            if trailing:
                self.on_clear_user(trailing.lower())
            else:
                self.on_clear_all()

        elif cmd == "CLEARMSG":
            target = tags.get("target-msg-id")
            if target:
                self.on_clear_msg(target)

        elif cmd == "USERNOTICE":
            self._usernotice(tags, trailing)

        elif cmd == "NOTICE" and "msg-id" in tags:
            self.log(f"  [chat] notice: {tags['msg-id']} {trailing}")

        elif cmd == "RECONNECT":
            raise ConnectionError("Twitch asked us to reconnect")

    # -- subscriptions ----------------------------------------------------
    SUB_KINDS = {"sub", "resub", "subgift", "submysterygift",
                 "giftpaidupgrade", "anongiftpaidupgrade"}

    def _usernotice(self, tags: dict, trailing: str) -> None:
        """Turn a USERNOTICE into a credits entry.

        Gifted subs credit the GIFTER, not the recipient - a gift bomb should
        be one line naming who paid, not twenty naming who received.

        Only resubs can carry a viewer-written message; Twitch does not offer
        a message box on a first-time sub or a gift. `trailing` is that text
        when present, and empty otherwise.
        """
        kind = tags.get("msg-id", "")
        if kind not in self.SUB_KINDS:
            return

        def num(key: str) -> int:
            try:
                return int(tags.get(key, "") or 0)
            except ValueError:
                return 0

        login = tags.get("login", "")
        self.on_sub({
            "kind": kind,
            "user": login.lower(),
            "name": tags.get("display-name") or login,
            "message": trailing or "",
            "months": num("msg-param-cumulative-months"),
            "tier": tags.get("msg-param-sub-plan", ""),
            # A mystery gift reports its size; a single gift counts as one.
            "gifted": num("msg-param-mass-gift-count") or
                      (1 if kind == "subgift" else 0),
            # Twitch's own wording, handy as a fallback label.
            "system": tags.get("system-msg", "").strip(),
        })
