# Next steps

Rewritten 2026-08-16 after the broadcast-design session. Everything before
this date's work is either shipped or closed by an owner decision below.

---

## 1. ALERTS  ← active

Plumbing is decided and half-built:

```
Twitch event -> Firebot -> POST 127.0.0.1:8722/alert -> overlay queue -> screen
```

- Alerts play **one at a time** with a minimum gap - a raid burst must never
  stack three animations
- Queue state rides the existing SSE channel; overlays already reconnect

The build list. Owner picks per event: **on/off, what it shows, sound or
silent, how long it holds.** Tackle one row at a time, top to bottom:

| # | Event | Data available | Decided? |
|---|---|---|---|
| 1 | New sub | name, tier | not yet |
| 2 | Resub | name, months, message | not yet |
| 3 | Gift sub(s) | gifter, count (credit the GIFTER, per credits rule) | not yet |
| 4 | Bits | name, amount, message | not yet |
| 5 | Raid | raider, viewer count | not yet |
| 6 | Follow | name | not yet |

Notes carried from earlier decisions:
- Sub/bits data already flows through `twitch_chat.py` parsing for the
  credits roll - the alert queue can share that feed for 1-4. Raids and
  follows need Firebot (follows are not in IRC at all).
- The broadcast layout's follower rail (`#follow`) is a display slot an
  alert can drive today via `alertName` / `alertMeta` in state.

## 2. INTERACTIVE ELEMENTS  ← waiting on owner's list

Channel point redeems, sub awards, and similar. Owner is drafting the list.
The threshold redeem is the working template: Firebot effect fires HTTP at
the control server, server drives OBS/overlays, auto-revert timer.
`buttons/FX-THRESHOLD-30S.vbs` + `/effect/threshold` show the whole pattern.

---

## Closed by owner decision (2026-08-16) - do not reopen unprompted

- **Twitch chat reader stays off** (`twitch.enabled: false`). Owner uses
  their own chat sources.
- **Split Cam speaker dimming stays off**, both tiles undimmed, both ticks
  yellow. The per-mic-levels upgrade is not wanted.
- **No Govee warranty claim.** The stuck H6076s run on the `lights/lan_hold.py`
  streamer and FLOOR-* buttons for good.
- **Broadcast logo size is final** at 30px.
- **Start Menu OBS shortcut stays flagless** - owner only launches from the
  taskbar pin, which carries `--enable-media-stream`. (If the waveform ever
  falls back to fake bars, an unflagged launch is why:
  `curl http://127.0.0.1:8722/slots` shows which mode each overlay got.)
- **Jamie's Cam Link no-signal is expected** - the camera works; Jamie is
  simply not present. Empty duo tiles are normal until he is.

## Shipped since the last version of this file

- Live waveform on the broadcast layout, fed by the Audience Mix capture,
  with CSS fallback + self-reporting (`/slots`)
- Broadcast design on Live Listen Duo/Solo; Split Cam seam scene;
  In Game camera edge; Live thumbnail frame
- Credits capture + end-screen roll (earlier session)
- Show-mode audio toggle: `buttons/SHOW-MODE.vbs` flips
  Audience + Mic/Aux against Show in one press, self-syncing
- FLOOR-YELLOW / RED / BLUE / DARK lamp buttons
