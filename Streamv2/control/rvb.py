"""RED VS BLUE - the team ledger.

Kept out of server.py and out of credits.json on purpose: this is a
different lifecycle (monthly, viewer-owned) from the per-stream credits,
and a bug in one must not be able to eat the other.

The draft is LAZY. Nothing runs on a schedule. Every chat message asks
"does this user have a team for the CURRENT month key?" - if not, they are
drafted then and there. So the first chat of a new month re-rolls
everyone automatically and there is no midnight job to fail.

The roll is balanced-random: weighted toward the smaller team, so sizes
stay within a member or two while any individual still gets a coin-flip
feel. A straight 50/50 drifts, and a stacked team makes the whole game
stale.

Points accrue per month. Attendance (who chatted THIS stream) is separate
and per-stream, because the end screen credits the winning team's members
who actually showed up.
"""
from __future__ import annotations

import json
import random
import threading
import time
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
TEAMS_FILE = HERE / "teams.json"

RED, BLUE = "red", "blue"


def month_key(when: float | None = None) -> str:
    d = datetime.fromtimestamp(when if when is not None else time.time())
    return f"{d.year:04d}-{d.month:02d}"


def day_key(when: float | None = None) -> str:
    d = datetime.fromtimestamp(when if when is not None else time.time())
    return f"{d.year:04d}-{d.month:02d}-{d.day:02d}"


class Teams:
    """The whole game's state. Thread-safe; every mutation persists."""

    def __init__(self, cfg: dict, on_change=None, on_draft=None):
        self.cfg = cfg or {}
        self.on_change = on_change or (lambda: None)
        self.on_draft = on_draft or (lambda user, name, team: None)
        self._lock = threading.RLock()
        self._data = {"month": month_key(), "members": {}, "points": {RED: 0, BLUE: 0},
                      "chat_today": {}, "attendance": []}
        self.load()
        self.purge_excluded()

    def excluded(self, user: str) -> bool:
        """Hosts, mods and bots: never drafted, never scored, never listed."""
        names = self.cfg.get("exclude", {}).get("users", []) or []
        return (user or "").strip().lower() in {str(u).strip().lower().lstrip("@")
                                                for u in names}

    def purge_excluded(self) -> None:
        """Drop anyone who has since been excluded from an existing roster.

        Runs at startup, so adding a name to the config and restarting is
        enough - no hand-editing teams.json.
        """
        with self._lock:
            gone = [u for u in self._data["members"] if self.excluded(u)]
            if not gone:
                return
            for u in gone:
                self._data["members"].pop(u, None)
                self._data["chat_today"].pop(u, None)
            self._data["attendance"] = [u for u in self._data["attendance"]
                                        if u not in set(gone)]
            self.save()

    # -- persistence ------------------------------------------------------
    def load(self) -> None:
        if not TEAMS_FILE.exists():
            return
        try:
            saved = json.loads(TEAMS_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            return  # a corrupt ledger must never stop the stream
        with self._lock:
            self._data.update({k: saved[k] for k in
                               ("month", "members", "points", "chat_today",
                                "attendance") if k in saved})
            self._data.setdefault("points", {RED: 0, BLUE: 0})
            self._roll_month_if_needed()

    def save(self) -> None:
        try:
            TEAMS_FILE.write_text(json.dumps(self._data, indent=2), encoding="utf-8")
        except OSError:
            pass

    # -- lifecycle --------------------------------------------------------
    def _roll_month_if_needed(self) -> None:
        """Called with the lock held. A new month empties the roster and the
        scores; captains are re-seeded by whoever calls seed_captains."""
        now = month_key()
        if self._data.get("month") != now:
            self._data["month"] = now
            self._data["members"] = {}
            self._data["points"] = {RED: 0, BLUE: 0}
            self._data["chat_today"] = {}
            self._data["attendance"] = []

    def reset_month(self) -> dict:
        """Draft night. Explicit only - never automatic mid-month."""
        with self._lock:
            self._data["members"] = {}
            self._data["points"] = {RED: 0, BLUE: 0}
            self._data["chat_today"] = {}
            self._data["attendance"] = []
            self._data["month"] = month_key()
            self.save()
            snap = self.snapshot_locked()
        self.on_change()
        return snap

    def reset_attendance(self) -> None:
        """New stream: forget who was here, keep teams and points."""
        with self._lock:
            self._data["attendance"] = []
            self.save()
        self.on_change()

    # -- the draft --------------------------------------------------------
    def _counts_locked(self) -> tuple[int, int]:
        m = self._data["members"].values()
        return (sum(1 for v in m if v["team"] == RED),
                sum(1 for v in m if v["team"] == BLUE))

    def team_of(self, user: str) -> str | None:
        with self._lock:
            row = self._data["members"].get(user)
            return row["team"] if row else None

    def draft(self, user: str, name: str) -> tuple[str | None, bool]:
        """Return (team, was_newly_drafted). Excluded users get (None, False)."""
        if self.excluded(user):
            return None, False
        with self._lock:
            self._roll_month_if_needed()
            row = self._data["members"].get(user)
            if row:
                if name and row.get("name") != name:
                    row["name"] = name
                    self.save()
                return row["team"], False
            red, blue = self._counts_locked()
            # Weight toward the smaller side; even sizes are a true coin flip.
            if red == blue:
                team = random.choice((RED, BLUE))
            else:
                smaller = RED if red < blue else BLUE
                team = smaller if random.random() < 0.75 else (
                    BLUE if smaller == RED else RED)
            self._data["members"][user] = {"name": name or user, "team": team,
                                           "ts": time.time(), "pts": 0}
            self.save()
        self.on_draft(user, name or user, team)
        self.on_change()
        return team, True

    # -- scoring ----------------------------------------------------------
    def _award_locked(self, user: str, pts: int) -> None:
        """Points belong to the MEMBER, not the team.

        Team totals are summed on read. That keeps the ledger honest when
        somebody is removed - excluding a mod takes their contribution with
        them, instead of orphaning points on a team with nobody on it.
        """
        row = self._data["members"].get(user)
        if row is not None:
            row["pts"] = int(row.get("pts", 0)) + pts

    def _totals_locked(self) -> tuple[int, int]:
        red = blue = 0
        for row in self._data["members"].values():
            if row["team"] == RED:
                red += int(row.get("pts", 0))
            else:
                blue += int(row.get("pts", 0))
        return red, blue

    def on_chat(self, user: str, name: str) -> None:
        """Draft if needed, mark attendance, award capped chat points."""
        if not user:
            return
        team, _ = self.draft(user, name)
        if team is None:
            return                      # excluded: no draft, no points, no attendance
        pts = self.cfg.get("points", {})
        per = int(pts.get("chat", 1))
        cap = int(pts.get("chat_cap_per_day", 20))
        with self._lock:
            if user not in self._data["attendance"]:
                self._data["attendance"].append(user)
            today = day_key()
            rec = self._data["chat_today"].get(user)
            if not rec or rec.get("day") != today:
                rec = {"day": today, "n": 0}
            if rec["n"] < cap:
                rec["n"] += 1
                self._award_locked(user, per)
            self._data["chat_today"][user] = rec
            self.save()
        self.on_change()

    def on_sub(self, user: str, name: str, gifted: int = 0) -> None:
        team, _ = self.draft(user, name)
        if team is None:
            return
        pts = self.cfg.get("points", {})
        amount = (int(pts.get("gift_each", 25)) * gifted) if gifted else int(pts.get("sub", 25))
        with self._lock:
            self._award_locked(user, amount)
            self.save()
        self.on_change()

    def on_bits(self, user: str, name: str, bits: int) -> None:
        team, _ = self.draft(user, name)
        if team is None:
            return
        per100 = int(self.cfg.get("points", {}).get("per_100_bits", 10))
        with self._lock:
            self._award_locked(user, int(bits / 100.0 * per100))
            self.save()
        self.on_change()

    # -- readout ----------------------------------------------------------
    def snapshot_locked(self) -> dict:
        red, blue = self._totals_locked()
        lead = RED if red > blue else (BLUE if blue > red else None)
        colors = self.cfg.get("colors", {})
        members = self._data["members"]
        present = [members[u]["name"] for u in self._data["attendance"]
                   if u in members and (lead is None or members[u]["team"] == lead)]
        rc, bc = self._counts_locked()
        return {
            "enabled": True,
            "month": self._data["month"],
            "red": red, "blue": blue,
            "lead": lead,
            "leadColor": colors.get(lead) if lead else None,
            # One colour for the border to follow: the leader's while
            # somebody leads, the neutral house colour while tied. Tied is
            # a real state, not an absence - nobody has taken the broadcast.
            "color": colors.get(lead) if lead else colors.get("neutral"),
            "colors": colors,
            "captains": self.cfg.get("captains", {}),
            "counts": {RED: rc, BLUE: bc},
            "attendance": sorted(present, key=str.lower),
        }

    def snapshot(self) -> dict:
        with self._lock:
            return self.snapshot_locked()
