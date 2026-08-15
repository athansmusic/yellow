# Next steps

Prepared groundwork for the four items queued up. Nothing here is built yet —
this is the research and the decisions, so the build is fast when we start.

---

## 1. Waveform of AUDIENCE MIX on the live scenes

**Already solved by a plugin you have installed.** `phandasm_waveform_source` is
in OBS and your old collection used two of them. Don't build this in HTML — a
browser source cannot read OBS's audio, so the only web route would be
`getUserMedia` on a second capture of the same device, which means duplicated
audio, drift, and latency.

Native plugin route:

- Add a **Waveform** source, bind its audio to the existing `Audience Mix` input
- Style to the house palette: `#FFF200` on transparent, zero radius
- Goes in the `[SRC]` layer as a shared source so Move matches it across scenes,
  same as `[CAM]`

Open questions for you:
- Which scenes — Live and In Game, or Live Listen too?
- Bar/level style, or a scrolling oscilloscope?
- Where does it sit? It needs its own strip; it should not overlap the cameras.

To decide at build time: whether the waveform lives in the stage HTML's layout
(so it gets a measured slot like the cameras) or floats free in OBS.

---

## 2. Alerts

Waiting on your list of what fires and what each one does.

**Recommended plumbing — Firebot, not a new integration.** Firebot is already
authenticated to your Twitch account and has an HTTP Request effect. So:

```
Twitch event -> Firebot -> POST 127.0.0.1:8722/alert -> stage renders it
```

No new OAuth, no tokens for me to hold, no second connection to babysit.

Server-side design when we build it:
- `POST /alert` with `{type, name, amount, message}` pushes onto a **queue**
- Alerts play one at a time with a minimum gap, so a raid burst cannot stack
  three overlapping animations on screen
- Queue state broadcasts over the existing SSE channel

The alert bar in the stage design (`#alert`) is already built and hides itself
when `alertName` is empty — that is the display half, done.

---

## 3. Stream interactive elements

Undefined so far. The mechanism is the same as alerts: Firebot channel-point
redemptions and chat commands POST to the control server, the stage reacts over
SSE. Worth listing what you actually want before any of it is designed.

---

## 4. CREDITS — subs during the stream  ← flagged very important

**This is the most tractable of the four, and it needs nothing new to collect.**

`control/twitch_chat.py` already connects to Twitch IRC anonymously and already
requests the `twitch.tv/commands` capability. Subscriptions arrive on that same
connection as `USERNOTICE` messages — no auth, no API key, no Firebot needed.

The tags carry everything the credits need:

| Tag | Gives you |
|---|---|
| `msg-id` | `sub`, `resub`, `subgift`, `submysterygift`, `giftpaidupgrade` |
| `display-name` | who subbed |
| `msg-param-recipient-display-name` | who a gift went to |
| `msg-param-cumulative-months` | resub length |
| `msg-param-sub-plan` | Prime / 1000 / 2000 / 3000 |
| `msg-param-mass-gift-count` | size of a mystery gift bomb |

**Must verify first:** that an anonymous `justinfan` connection actually receives
`USERNOTICE`. It receives `PRIVMSG` and `CLEARCHAT` (proven), and `USERNOTICE`
should come with the same capability — but this is the one assumption the whole
feature rests on, so it gets tested against a real sub before anything is built
on top of it. Fallback if not: Firebot's sub event POSTing to the server, same
pattern as alerts.

Design:
- Accumulate a **session** list, separate from `messages`, persisted to disk so
  an OBS or server restart mid-stream does not lose the credits
- `POST /credits/reset` at stream start — must be explicit, never automatic, or
  a crash-restart silently wipes the list
- Dedupe by username; a gift bomb should list the gifter once with a count, not
  twenty rows
- End-screen overlay renders the list, in house style, scrolling if long

Decisions needed from you:
- Gifted subs: credit the **gifter**, the **recipients**, or both?
- Resubs listed separately from new subs, or one combined list?
- Does the end screen show anything else — raids, bits, follows?

---

## Known open items, unrelated to the above

- **`[GUEST]` reports `0x0`** — the Cam Link has no signal, so the bottom
  two-shot tile renders empty. Needs a camera plugged in, or repoint `[GUEST]`
  at a different device in `config.json`.
- **Govee BLE** — the H617A's control characteristic is confirmed present and
  writable, and it connected once with a 60s timeout. Everything since fails at
  `Could not get GATT services: Unreachable`. Two causes tangled together: the
  factory reset likely put it in Wi-Fi pairing mode, and all four Govee devices
  sit at -86 to -96 dBm, which is too weak for a reliable button. Resolve range
  first (move a light closer, or a USB Bluetooth adapter on a cable near them)
  before any control layer is worth writing.
- **Twitch chat reader is disabled** (`twitch.enabled: false`) since you are
  building your own chat. The parser, badges, emotes and mod-deletion handling
  all still work — one flag brings it back as a data feed.
- **Your chat slot**: `916, 262` — `980 x 736`, inside the panel frame the
  stage draws.
