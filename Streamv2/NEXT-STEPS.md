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
| firebot-raid.html | installed | INTRUSION DETECTED: letterbox + fire + big bar, 12s; pairs with POST /effect/threshold {"seconds":12} for the black/yellow takeover; raid shoutout chat effect uses $username. FIXED 2026-08-18: the effect had no overlay instance set, so it drew on the default Firebot source that is not on any live scene - all alerts must target the `Twitch Alerts` instance (that is the instance name; NEXT-STEPS previously said REDACTED, which was never a real instance) |
| firebot-resub.html | ready, not installed | |
| firebot-bits.html | ready, not installed | amount via the $ picker |

Regenerator: scratchpad build_alerts.py (session-local) - but each html
file is self-contained; edit them directly if the scratchpad is gone.
Firebot gotchas learned: it validates every $word in the pasted box,
comments included; only $username is safe on all events; never style
document.body from a Show HTML (it outlives the effect's removal).
The fire layer (media/fire-alpha.webm, luma-keyed from Fire.mov) streams
off the control server via /file - server down = alert plays fireless.

## ROTATING PROMPTS — SHIPPED 2026-08-18, REDESIGNED SAME DAY

Bottom-right TERMINAL TICKER on the main overlay (owner picked this
concept over the brush-bar version - the zip lives in Downloads as
"Podcast livestream layout design (5).zip"): a small dark panel that
types each prompt on character by character, holds, backspaces, moves
on. Blinking caret, scanline, pulsing "unit feed" label. Fed by the
panel textarea (one prompt per line) + seconds-each field; empty box
hides it, `?no=prompts` opts a source out. Box width auto-fits the
longest line. All motion is JS textContent writes on persistent DOM -
deliberately animation-free where it matters, because of the CEF
lessons below. media/bar1/bar2 are now unused by the overlay (originals
kept as bar*-orig.png).

Ops note from the same day: port 8722 can end up DOUBLE-BOUND if an
elevated orphan of server.py survives - it wins all connections and
serves stale code while a fresh server listens beside it. Symptom: file
edits that never show up in /state. Check `netstat -ano | findstr 8722`
for two LISTENING pids; an elevated one needs an admin taskkill.

Related CEF lessons (same day, learned the hard way):
- NEVER navigate or refresh a browser source from outside (websocket
  refreshnocache is unreliable; SetInputSettings URL bounces WEDGE the
  CEF instance - white page, deaf to everything, only an OBS restart
  recovers it; relaunch with --enable-media-stream
  --use-fake-ui-for-media-stream, same as the taskbar pin).
- To deploy overlay code instead:
  curl -X POST 127.0.0.1:8722/state -d "{\"reloadNonce\":\"anything-new\"}"
  The overlay reloads ITSELF when the nonce changes (self-reload is safe;
  outside navigation is not).
- CEF also intermittently fails to composite background images on freshly
  inserted DOM. The prompt bar therefore keeps a PERSISTENT DOM: both
  strokes exist from page load, rotation only crossfades opacity and
  swaps text, and final states are inline styles (animations are optional
  polish CEF may drop). Do not refactor it back to create-per-rotation.

## BRB SCENE + FAN ART PIPELINE — SHIPPED 2026-08-18

Tumblr tag -> approval -> on-stream gallery, all local:

- `control/artqueue.py` polls #the redacted unit every 2 min (api key in
  config.local.json; NPF gotcha: images live inside text-post bodies,
  and filter=text would strip them). Backfilled the tag's full history.
- `/artqueue` is the moderation portal (A approve / X reject / U undo).
  NOTHING renders unapproved.
- `/brb` is the scene page (owner's design, no bg): auto-fit writable
  headline, write-in note, BACK IN clock, up-next, chat safe area at
  800,168 268x560, gallery at 1132,168 660x660.
- Rotation: every 25s the SERVER picks from all approved, weighted
  1/(1+shows); shows only count while OBS streams. Glitch-wipe swap.
- Entering any scene named *brb* re-arms the clock from the panel's
  minutes field (scene watcher LISTENS only - never drives OBS).
- Panel: headline / note / up next / minutes fields.
- Instagram: declined - Meta's hashtag API strips artist credit and
  wants business-account app review. Do not reopen unprompted.

## !BUCKLEIN — SHIPPED 2026-08-18

The owner opens every stream with "buckle in", so chat has to comply.
`control/buckle.py`: chatters have the WHOLE stream to !bucklein (no
mid-stream tickets - owner overruled the grace-period design); switching
to the Ending scene tickets every unbuckled chatter AT ONCE - the wall
is the joke. Citations are written in the panel (one per line, {user}),
used IN ORDER. Chat lines go out via Firebot preset "Buckle Ticket".
Bots/hosts ride free on rvb.exclude.users. Only counts while live.
Test rig: POST /dev/startup (+ action "stop"), /dev/simulate.

Art queue hardening, same day: #keepredacted / #keep redacted (any
case/spacing) blocks a post from rotation at ingest, and a 6-hour
reverify pass catches opt-out tags added later and deleted posts.
Dashboard-only blogs 404 on the per-post API even when alive - the
pass never blocks on an unverifiable lookup.

## STAGE SCENE AUTOMATION — SHIPPED 2026-08-18 (v1)

Entering the scene named exactly "Stage" unmutes the FL Studio source
(CABLE Output capture, muted at rest, on the Stage scene); leaving
re-mutes it. Verified live, both directions, twice. v1 for the 3rd-gen
2i2 (NO loopback): the voice stays on the normal Mic/Aux chain and is
NEVER touched by the automation - FL carries backing/synth only, so no
camera delay is needed. Config: `stage` block. The restore fires only
on a real Stage exit (prev-scene tracked, seeded at startup), so it
cannot fight SHOW-MODE.

Owner still to do in FL: device = FL Studio ASIO with output CABLE
In, 48k everywhere, Windows "Listen" on CABLE Output -> Focusrite for
ears, 2i2 Direct Monitor for voice. Full FL vocal chain (MUSIC-SETUP)
waits on a loopback-capable interface (4th gen).

## 2. LIVE CAPTIONS  ← research, then owner decides

Owner asked (2026-08-16): can captions go on the live screen easily?
Question to answer before building anything: which route -
local Whisper-class model feeding an overlay, OBS captioning plugin, or
Twitch's own CC. Weigh latency, accuracy on show audio vs mic, and whether
it can style-match the house look.

## 3. INTERACTIVE ELEMENTS

The threshold redeem is the working template: Firebot effect fires HTTP at
the control server, server drives OBS/overlays, auto-revert timer.
`buttons/FX-THRESHOLD-30S.vbs` + `/effect/threshold` show the whole pattern.
Shipped so far: threshold, mic EQ (`/effect/micfx`).

### RED VS BLUE — SHIPPED 2026-08-18

Built and verified end to end. `control/rvb.py` owns the ledger in its own
`teams.json`; `overlays/scorebar.html` carries the peek and the stamps.

- Draft: lazy, per calendar month, balanced-random (weighted to the smaller
  side). Only while live.
- Points: chat 1 (cap 20/day), sub 25, gift 25 each to the GIFTER, bits 10
  per 100. WATCH THIS: 10k bits = 1000 pts = 50 chatty regulars. Owner chose
  to see how it plays on a real stream before rebalancing.
- Scoring is gated on OBS actually streaming, seeded from GetStreamStatus at
  startup so a mid-stream restart does not silently stop counting.
- Colours: RED #d40019, BLUE #1f3fde, #FFF200 when tied. The SCREEN border
  and the three standing lamps both follow one published colour, so they
  cannot disagree. Cam border stays pink, deliberately out of the game.
- Lamps: .84/.85 streamed (stuck firmware), .133 gets one ordinary command.
  Never the Bluetooth table light.
- Draft night is a BUTTON (`buttons/RVB-DRAFT-NIGHT.vbs`), not a midnight
  rollover: a new month leaves last month's game running and flags
  `draftDue` until pressed. `rvb.draft_night.manual=false` restores auto.
- Chat lines (draft announcements, !team) go out through Firebot preset
  effect lists `RVB Draft` and `RVB Team`, called by name.
- Excluded from the game entirely: athansmusic, curtaincontrol, and the
  usual bots (`rvb.exclude.users`). Adding a name purges them on restart.

Not built yet: team-gated redeems exist as `POST /rvb/gate` but the owner
has not wired one to a channel point reward.

## Closed by owner decision (2026-08-16) - do not reopen unprompted

- **The chat reader may SEE chat but must never DRAW it** (clarified
  2026-08-17). Turning `twitch.enabled` on as a data feed (RVB draft,
  points, counters) is fine; rendering messages through the built-in
  overlay chat is not - the owner disliked that design and uses their
  own chat sources exclusively. The stage URLs' `chat=ext` pin stays.
- **Split Cam speaker dimming stays off**, both tiles undimmed, both ticks
  yellow. The per-mic-levels upgrade is not wanted.
- **No Govee warranty claim.** The stuck H6076s run on the `lights/lan_hold.py`
  streamer and FLOOR-* buttons for good.
- **Broadcast logo size is final** at 30px.
- **Start Menu OBS shortcut stays flagless** - owner only launches from the
  taskbar pin, which carries `--enable-media-stream`. (If the waveform ever
  falls back to fake bars, an unflagged launch is why:
  `curl http://127.0.0.1:8722/slots` shows which mode each overlay got.)
- **No screen-on-cam scene.** Tried twice (a separate Live Screen scene,
  then a framed monitor capture inside a group on Live) and dropped both.
  `overlays/screenframe.html` still exists at /screenframe if it is ever
  wanted, but do not rebuild this unprompted.
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
