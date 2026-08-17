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

## 2. SCREEN-ON-CAM LAYOUT  ← prototype ready, owner composes on return

Owner's mock (2026-08-17): full-bleed host cam, an "ON SCREEN" panel
floating right with a dashed accent frame + caption line, face sitting
left-centre in the space the panel leaves. "Maybe a fade out into a
background."

Prototype built: `overlays/onscreen.html` (route `/onscreen`) - the
panel frame, labels and ground in house style, reports its screen-slot
rect to `/slots` so the Screen source can be fitted exactly, caption
derives from the episode fields with a `?caption=` override.

Layout options to decide together:

A. **Overlay only** (the mock literally): cam stays full-bleed and
   untouched; panel floats over the right. Cheapest, but the face must be
   physically framed left or it hides behind the panel.
B. **Second scene + Move transition** (recommended): a "Live Screen"
   scene where [CAM] sits shifted left and the panel + Screen live on the
   right. The Move transition already matches [CAM] across scenes, so
   switching slides the cam over in 160ms - the "pop up" becomes a scene
   switch on a deck button, which also solves the toggle.
C. **The fade-into-background**: the cam's edges dissolve into the
   textured ground instead of hard-edging - an alpha-gradient mask on the
   cam (image mask filter, like the In Game rounded mask but a gradient),
   or the overlay painting ground-coloured gradients over the cam edges.
   Pairs with either A or B.

Owner said "we can mess with it when I'm back" - do not build scenes
until then. The user's own `Full Cam Screen` item in Live is their
work-in-progress; leave it alone.

## 3. LIVE CAPTIONS  ← research, then owner decides

Owner asked (2026-08-16): can captions go on the live screen easily?
Question to answer before building anything: which route -
local Whisper-class model feeding an overlay, OBS captioning plugin, or
Twitch's own CC. Weigh latency, accuracy on show audio vs mic, and whether
it can style-match the house look.

## 4. INTERACTIVE ELEMENTS

The threshold redeem is the working template: Firebot effect fires HTTP at
the control server, server drives OBS/overlays, auto-revert timer.
`buttons/FX-THRESHOLD-30S.vbs` + `/effect/threshold` show the whole pattern.
Shipped so far: threshold, mic EQ (`/effect/micfx`).

### RED VS BLUE  ← the centrepiece, designed 2026-08-17

Owner's revived team system - name stays RED VS BLUE (owner's call, and
red/blue both read perfectly on the black ground). v1 died of two things:
built poorly, and winning meant nothing. The redesign fixes both.

**The reason to compete: the leading team holds the broadcast.** When a
team takes the lead, the SCREEN border (Live Frame / frameglow) becomes
their colour until the other team takes it back - the frame around the
stream is the standing scoreboard. Scope decided by owner 2026-08-17:
the screen border ONLY - the camera border (IG Cam Edge) stays pink
permanently, and the pink ?accent pin on the screen frames gets replaced
by the state-driven team colour when this ships. Neutral (start of
stream / tie) is undecided - yellow-until-first-blood is the candidate.

Mechanics:
- Assignment: first-ever chat = drafted (Viewer Arrived, same trigger as
  walk-ons). Roster in a teams.json ledger on the control server, same
  shape and reset discipline as credits.json.
- Points: chatting (capped per stream or spam becomes the meta), bits and
  subs (weighted so money helps but cannot buy the month), watch time
  (Firebot tracks it natively - bridge, do not rebuild).
- Captains: Athan captains one team, Jamie the other, and the captains
  KEEP their teams permanently - only viewers reshuffle at draft night.
  On-air trash talk is the content engine; the losing captain does a
  forfeit at month end.
- Powers: leading team's threshold fires in their colour; floor lamps go
  team colour at stream start; selected redeems only fire for the leading
  team (server checks the username against the roster - Firebot passes it).
- Score peek: channel points show a 5s tug-of-war bar with exact numbers.
  Ambient colour says who leads; the bar says by how much.
- End screen, PER STREAM: a credits section below subs/bits (smaller type
  than both) - "RED TEAM HELD THE LEAD THIS STREAM. MEMBERS IN
  ATTENDANCE:" followed by every winning-team member who chatted that
  stream. Attendance comes from the same per-stream chatter tracking the
  points use, so being listed only requires showing up and talking - the
  cheap seats get their name on the broadcast, which is the retention
  hook.
- Month end: the losing captain's forfeit, then a draft-night viewer
  reshuffle - an event, never a silent reset.

Build order when we start: roster + points ledger -> ambient colour
takeover -> score bar -> team-gated redeems -> monthly ceremony.

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
