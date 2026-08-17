# Next steps

Rewritten 2026-08-16 after the broadcast-design session. Everything before
this date's work is either shipped or closed by an owner decision below.

---

## 1. ALERTS  — SHIPPED 2026-08-17

Owner went with Firebot's own queue instead of the planned control-server
one: each event runs a Show HTML effect pasting a file from `alerts/`, on
the `REDACTED` overlay instance (positionable separately from other
Firebot alerts).

The family - all built on the show's brush-stroke redaction bar
(media/redactedbar.png, embedded per file, ink forced to house black):

| File | Status | Notes |
|---|---|---|
| firebot-sub.html | installed | name declassifies out of the bar, 6s |
| firebot-gift.html | installed | credits the GIFTER, 6s |
| firebot-follow.html | installed | ANONYMOUS - no name, small stamp, 3s |
| firebot-raid.html | installed | INTRUSION DETECTED: letterbox + fire + big bar, 12s; pairs with POST /effect/threshold {"seconds":12} for the black/yellow takeover; raid shoutout chat effect uses $username |
| firebot-resub.html | ready, not installed | |
| firebot-bits.html | ready, not installed | amount via the $ picker |

Regenerator: scratchpad build_alerts.py (session-local) - but each html
file is self-contained; edit them directly if the scratchpad is gone.
Firebot gotchas learned: it validates every $word in the pasted box,
comments included; only $username is safe on all events; never style
document.body from a Show HTML (it outlives the effect's removal).
The fire layer (media/fire-alpha.webm, luma-keyed from Fire.mov) streams
off the control server via /file - server down = alert plays fireless.

## 2. LIVE CAPTIONS  ← research, then owner decides

Owner asked (2026-08-16): can captions go on the live screen easily?
Question to answer before building anything: which route -
local Whisper-class model feeding an overlay, OBS captioning plugin, or
Twitch's own CC. Weigh latency, accuracy on show audio vs mic, and whether
it can style-match the house look.

## 3. INTERACTIVE ELEMENTS  ← waiting on owner's list

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
