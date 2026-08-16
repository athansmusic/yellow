#!/usr/bin/env python3
"""Fake subs and bits so the ending scene can be tested before going live.

Sends REAL Twitch IRC lines to the running control server, which replays them
through the same parser the live reader uses. Only the TCP socket is skipped -
tag parsing, gifter attribution, dedupe, tier labels and the credits store are
all exercised exactly as they will be on stream.

    python simulate.py demo        a realistic mix - use this one
    python simulate.py sub         one new sub
    python simulate.py resub       a resub with a message
    python simulate.py gift 5      a gift bomb of 5
    python simulate.py bits 500    a bits cheer
    python simulate.py clear       wipe the list

IMPORTANT: this writes to the same credits list the stream uses. Run
`python simulate.py clear` before you go live, or the fake names end up on
your real end screen.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.request

BASE = "http://127.0.0.1:8722"
CHAN = "athansmusic"


def usernotice(tags: dict, message: str = "") -> str:
    tag_str = ";".join(f"{k}={v}" for k, v in tags.items())
    line = f"@{tag_str} :tmi.twitch.tv USERNOTICE #{CHAN}"
    return f"{line} :{message}" if message else line


def privmsg_bits(name: str, amount: int, text: str) -> str:
    login = name.lower()
    return (f"@bits={amount};display-name={name};id=sim-{login} "
            f":{login}!{login}@{login}.tmi.twitch.tv PRIVMSG #{CHAN} :{text}")


def sub(name: str, plan: str = "1000") -> str:
    return usernotice({"display-name": name, "login": name.lower(),
                       "msg-id": "sub", "msg-param-cumulative-months": "1",
                       "msg-param-sub-plan": plan})


def resub(name: str, months: int, message: str, plan: str = "1000") -> str:
    return usernotice({"display-name": name, "login": name.lower(),
                       "msg-id": "resub",
                       "msg-param-cumulative-months": str(months),
                       "msg-param-sub-plan": plan}, message)


def gift(name: str, count: int, plan: str = "1000") -> str:
    if count == 1:
        return usernotice({"display-name": name, "login": name.lower(),
                           "msg-id": "subgift",
                           "msg-param-recipient-display-name": "someviewer",
                           "msg-param-sub-plan": plan})
    return usernotice({"display-name": name, "login": name.lower(),
                       "msg-id": "submysterygift",
                       "msg-param-mass-gift-count": str(count),
                       "msg-param-sub-plan": plan})


DEMO = [
    sub("StaticAda"),
    resub("HollowCastle", 14, "the cold open genuinely got me this week", "2000"),
    resub("QuietRiver", 3, "resubbing purely for the terrible puns"),
    gift("NightPorter", 1),
    gift("NightPorter", 1),                     # same gifter - must merge
    gift("Verrocchio", 10),
    resub("Bellhouse", 24, "two years. still the comfiest corner of the internet", "3000"),
    sub("Ninefold", "Prime"),
    resub("LowTide", 8, "the vod saved my night shift. thank you", "Prime"),
    # A raid, which must NOT appear in credits.
    usernotice({"display-name": "SomeRaider", "login": "someraider",
                "msg-id": "raid", "msg-param-viewerCount": "42"}),
    privmsg_bits("QuietRiver", 500, "take my bits"),
    privmsg_bits("QuietRiver", 250, "and some more"),
    privmsg_bits("Toastcrumb", 1000, "cheer1000 worth every one"),
]


def post(path: str, payload: dict | None = None) -> dict:
    data = json.dumps(payload).encode() if payload is not None else b""
    req = urllib.request.Request(BASE + path, data=data, method="POST",
                                 headers={"Content-Type": "application/json"})
    return json.loads(urllib.request.urlopen(req, timeout=10).read())


def show(credits: dict) -> None:
    subs, bits = credits.get("subs", []), credits.get("bits", [])
    print(f"\n  {len(subs)} subscriber row(s):")
    for r in subs:
        tag = (f"gifted {r['gifted']}" if r["gifted"]
               else f"{r['months']} mo" if r["months"] > 1 else r.get("tier") or "sub")
        # Plain quotes: the Windows console is cp1252 and mangles curly ones.
        msg = f'  "{r["message"][:44]}"' if r["message"] else ""
        print(f"    {r['name']:<16} {tag:<12}{msg}")
    if bits:
        print(f"\n  {len(bits)} bits row(s):")
        for r in bits:
            print(f"    {r['name']:<16} {r['bits']}")


def main() -> int:
    args = sys.argv[1:] or ["demo"]
    cmd = args[0].lower()

    try:
        if cmd == "clear":
            show(post("/credits/reset"))
            print("\n  cleared")
            return 0

        if cmd == "demo":
            lines = DEMO
        elif cmd == "sub":
            lines = [sub(args[1] if len(args) > 1 else "TestSubber")]
        elif cmd == "resub":
            lines = [resub(args[1] if len(args) > 1 else "TestResubber", 12,
                           "testing the credits roll from simulate.py")]
        elif cmd == "gift":
            lines = [gift(args[1] if len(args) > 2 else "TestGifter",
                          int(args[-1]) if args[-1].isdigit() else 5)]
        elif cmd == "bits":
            lines = [privmsg_bits("TestCheerer",
                                  int(args[-1]) if args[-1].isdigit() else 100,
                                  "testing bits")]
        else:
            print(__doc__)
            return 2

        result = post("/dev/simulate", {"lines": lines})
        print(f"replayed {result['replayed']} IRC line(s) through the real parser")
        show(result["credits"])
        print("\n  remember: python simulate.py clear  before going live")
        return 0

    except urllib.error.URLError as exc:
        print(f"cannot reach the control server at {BASE}: {exc}", file=sys.stderr)
        print("start it with start-control.bat", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
