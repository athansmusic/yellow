"""!bucklein compliance. Buckle in or get a ticket.

The owner opens every stream with "buckle in" - so chat gets a seatbelt
check. Anyone who chats during a live stream gets a grace period to type
!bucklein; if it runs out, the safety office issues exactly one ticket in
chat, through a Firebot preset effect list (this process holds no Twitch
token - Firebot is the one authenticated as the broadcaster).

Rules of the road:
- Only counts while OBS is actually streaming. Off-air chat is nobody's
  business.
- One ticket per user per stream, ever. max_tickets_per_sweep 0 means
  UNLIMITED - every overdue chatter gets cited in the same sweep. The
  owner wants the wall: a pileup is the joke.
- Buckling at ANY point before the grace runs out - even before their
  first message - keeps a user safe for the whole stream.
- The exclusion list (bots, hosts) never gets ticketed and never needs
  to buckle.

Firebot setup (one time): create a preset effect list named "Buckle
Ticket" containing a Chat effect whose message is $presetListArg[message].
The server fills `message` with a random citation and also passes
`username` in case the owner wants to build fancier effects.
"""
from __future__ import annotations

import threading
import time

DEFAULT_TEMPLATES = [
    "TICKET ISSUED: {user} - OPERATING A CHAT WITHOUT BUCKLING IN",
    "{user} CRASHED. THEY WERE NOT BUCKLED IN. WITNESSES CALL IT PREVENTABLE.",
    "INCIDENT REPORT: {user} EJECTED ON THE FIRST TURN. NO BUCKLE DETECTED.",
    "CITATION: {user} CAUGHT RIDING UNRESTRAINED IN AN ACTIVE BROADCAST",
    "{user} WENT STRAIGHT THROUGH THE WINDSHIELD. !bucklein NEXT TIME.",
    "SAFETY OFFICE: {user} FINED $0 (WARNING ON PERMANENT RECORD) - FAILURE TO !bucklein",
]


class Buckle:
    def __init__(self, cfg: dict, firebot, is_live, log=print,
                 templates_fn=None):
        self.command = str(cfg.get("command", "!bucklein")).lower()
        self.grace = int(cfg.get("grace_seconds", 240))
        self.preset = cfg.get("preset", "Buckle Ticket")
        # The panel owns the citation copy (one per line, {user} inside);
        # templates_fn reads it live so edits apply without a restart.
        self._templates_fn = templates_fn or (lambda: [])
        self._cycle = 0
        self.per_sweep = int(cfg.get("max_tickets_per_sweep", 2))
        self.exclude = {str(u).lower() for u in cfg.get("exclude_users", [])}
        self.fb = firebot
        self.is_live = is_live          # callable - the server owns _live
        self.log = log
        self._lock = threading.Lock()
        self._chatters: dict[str, tuple[float, str]] = {}  # user -> (first ts, display)
        self._buckled: set[str] = set()
        self._ticketed: set[str] = set()
        threading.Thread(target=self._sweep_loop, daemon=True).start()

    def reset(self) -> None:
        """Fresh stream, fresh manifest - nobody is buckled yet."""
        with self._lock:
            self._chatters.clear()
            self._buckled.clear()
            self._ticketed.clear()

    def on_chat(self, user: str, name: str, text: str) -> None:
        user = (user or "").lower()
        if not user or user in self.exclude or not self.is_live():
            return
        with self._lock:
            if (text or "").strip().lower().startswith(self.command):
                self._buckled.add(user)
                return
            self._chatters.setdefault(user, (time.time(), name or user))

    def flush(self) -> None:
        """The reckoning: entering the Ending scene tickets EVERY
        unbuckled chatter at once, grace period or not. The stream is
        over; there is no more time to buckle."""
        self._sweep(ignore_grace=True)

    def _sweep_loop(self) -> None:
        while True:
            time.sleep(20)
            try:
                self._sweep()
            except Exception:                              # noqa: BLE001
                pass

    def _sweep(self, ignore_grace: bool = False) -> None:
        if not self.is_live() or self.fb is None:
            return
        now = time.time()
        due = []
        with self._lock:
            for user, (first_ts, display) in self._chatters.items():
                if user in self._buckled or user in self._ticketed:
                    continue
                if ignore_grace or now - first_ts >= self.grace:
                    due.append((first_ts, user, display))
            due.sort()                       # longest-overdue first
            if self.per_sweep > 0 and not ignore_grace:
                due = due[:self.per_sweep]
            for _, user, _ in due:
                self._ticketed.add(user)
        templates = [t.strip() for t in self._templates_fn() if t.strip()]             or DEFAULT_TEMPLATES
        for _, user, display in due:
            # In order, not random - the owner writes these and the order
            # is part of the bit.
            line = templates[self._cycle % len(templates)].replace("{user}", display)
            self._cycle += 1
            self.log(f"  [buckle] {line}", flush=True)
            self.fb.run_preset(self.preset, {"username": display,
                                             "message": line})
