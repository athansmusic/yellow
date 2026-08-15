# Stream rebuild

Control layer for the OBS setup. Graphics and music are yours; this repo owns
scene structure, transitions, hotkeys, and the Live Listen episode info.

**4 scenes, 13 sources.** The old `REDACTED Primary` collection was 30 scenes and
269 sources. Nothing here is hand-edited JSON — `config.json` is the source of
truth and `build_scenes.py` regenerates the collection.

---

## Quick start

Generate the collection:

```bash
python build_scenes.py
```

Import it: **OBS → Scene Collection → Import →** `dist/Rebuild.json`, then switch
to it. Your existing collections are untouched and remain in the list.

Start the control server. **The Live Listen scenes render empty without it** —
both stage layers are browser sources pointing at it.

| How | What happens |
|---|---|
| `start-control.bat` | Console window, Ctrl+C to stop |
| `start-control-silent.vbs` | No window, runs in the background |
| Shortcut to the `.vbs` in `shell:startup` | Runs automatically at every login |

The last one is what you want long term. Press `Win+R`, paste `shell:startup`,
and drop a shortcut to `start-control-silent.vbs` in the folder that opens.

Then open <http://127.0.0.1:8722/> for the control panel. It shows
*"server offline — retrying"* whenever the server isn't up, so the panel doubles
as your status check. To stop a silent instance, end `pythonw.exe` in Task
Manager.

---

## The one idea that makes transitions smooth

Move Transition animates a source only when the **same source name** exists in
both the outgoing and incoming scene. In the old collection, `Live New` and
`In Game New` shared 11 names out of 85 and 30 — and the camera wasn't one of
them (`Camera Main` in one, `GreenScreen Cam` in the other). So there was nothing
to interpolate and you got a plain fade.

Here the camera is a nested scene called `[CAM]`, used in all three camera
scenes with different geometry:

| Scene | `[CAM]` position | size |
|---|---|---|
| Live | 0, 0 | 1920 × 1080 |
| In Game | 1376, 664 | 512 × 384 |
| Live Listen | 464, 132 | 496 × 620 |

Switching Live → In Game now slides and scales the camera into the corner over
400 ms instead of cross-fading. Chat sits at the **identical** rect in all four
scenes on purpose — Move holds it perfectly still while everything else moves.

---

## Stream Deck mapping

F13–F18 don't exist on a physical keyboard, so nothing can steal them. Bind each
Stream Deck key to send the keystroke, or use the OBS plugin's native scene
actions and ignore the hotkeys entirely.

| Key | Action |
|---|---|
| F13 | Starting Soon |
| F14 | Live |
| F15 | In Game |
| F16 | Live Listen |
| F17 | Camera keying **on** |
| F18 | Camera keying **off** |

You can make the **In Game** button a multi-action that sends `F15` then `F17`,
and **Live** send `F14` then `F18`. That works, but it only holds if you always
use those buttons — switch scenes from the OBS UI or a Firebot trigger and
keying won't follow. Prefer the macros below.

---

## Make keying follow the scene (recommended)

Two Advanced Scene Switcher macros make keying a property of the *scene* rather
than of the button you pressed, so you can't end up in the corner box with your
real room behind you.

The plugin is already installed. Build these in **Tools → Advanced Scene
Switcher → Macro**:

**Macro 1 — "Key on in In Game"**

- Condition: `Scene` → *is* → `In Game`
- Action: `Scene Visibility` → scene `[CAM]`, source `Cam Keyed`, → *Show*
- Action: `Scene Visibility` → scene `[CAM]`, source `Cam Raw`, → *Hide*
- Else-action: `Scene Visibility` → scene `[CAM]`, source `Cam Keyed`, → *Hide*
- Else-action: `Scene Visibility` → scene `[CAM]`, source `Cam Raw`, → *Show*

That single macro is enough — the else branch covers every other scene. Add a
second one only if you later want keying in Live Listen too.

I did **not** generate these into the collection. ASS serializes its own action
schema and your config has no `scene_visibility` example to copy, so writing that
JSON by hand would be guesswork — a macro that silently fails to load is worse
than five minutes in the GUI.

### Your macros survive a regenerate

ASS stores its entire config *inside the scene collection*, so a naive re-import
would wipe anything you build. `build_scenes.py` reads the installed copy of the
collection and carries its `modules` block forward automatically:

```
preserved modules from Rebuild.json (1 Advanced Scene Switcher macro(s))
    - Key on in In Game
```

If you don't see that line after building macros, the collection wasn't found —
pass it explicitly:

```bash
python build_scenes.py --preserve-modules "%APPDATA%/obs-studio/basic/scenes/Rebuild.json"
```

Use `--no-preserve` to deliberately start clean. Same applies to any other
plugin that stores config in the collection.

### The option that removes the problem entirely

If you'd rather have your own background art behind a keyed camera in **Live**
too — instead of your real room — then keying is simply always on, both `Cam Raw`
and the toggle disappear, and there's no macro to maintain. Say the word and
I'll restructure; it's a smaller collection, not a bigger one.

---

## Camera chain — read this one

Your camera currently enters OBS as `Camera (NVIDIA Broadcast)`, which means
Broadcast is already running AI background removal, and then OBS runs
`nv_greenscreen_filter` on top. Two AI passes costs GPU and softens edges,
especially around hair.

Since you're going AI-only with no cloth, do the removal **once, in OBS**, where
it's scene-controllable:

1. In NVIDIA Broadcast, turn the background effect **off** (keep noise removal if
   you use it — that's audio, unrelated).
2. In `config.json`, set `devices.camera.video_device_id` to the **raw** camera
   device rather than the Broadcast virtual cam.
3. Re-run `python build_scenes.py` and re-import.

To find the raw device string: add a Video Capture Device in OBS, pick your
camera, then read the value back out of the saved collection — or just try the
device names OBS lists and re-generate.

Keying quality knobs live in `config.json → keying`:

- `mode`: `0` = quality, `1` = performance. Start at `0`; the 4070 has room.
- `threshold`: `1.0` default. Lower toward `0.8` if it eats your hair; raise if
  the background bleeds through.

---

## Live Listen

Implements the Nocturne stage design. Two OBS scenes:

| Scene | Hotkey | Layout |
|---|---|---|
| `Live Listen` | F16 | Two-shot — Cam A and Cam B stacked, 872×491 tiles |
| `Live Listen Solo` | F17 | Solo focus — Cam A alone at 1400×788, chat column narrows |

### The layer sandwich

The design paints the panels full-canvas, so a single browser source would bury
your cameras. It renders as two layers with the cameras between:

```
Stage Front      nameplates + tile edges          (transparent)
[CAM] / [GUEST]  native OBS camera sources
Stage Back       episode block, chat, follower bar
[BG]             your background
```

Each Live Listen scene has its **own** pair of stage layers, pinned to a layout
by URL:

| Source | URL |
|---|---|
| `Stage Back` / `Stage Front` | `?layer=…&scene=two` |
| `Stage Back Solo` / `Stage Front Solo` | `?layer=…&scene=solo` |

They must be separate sources. Sharing one pair meant both scenes rendered
whatever the shared state said, so switching scenes moved the camera but not
the layout.

### The background is yours

The stage ground is **transparent** — only the chat panel, episode block,
follower bar and nameplates paint their own fills. Put whatever you like
underneath.

`[BG]` is a shared nested scene used at the bottom of both Live Listen scenes,
the same trick as `[CAM]`: point **one** source at your artwork and both scenes
follow, and Move holds it dead still when you cut between two-shot and solo.

It ships with `BG Placeholder`, a flat `#090909` colour source, so the stage
looks like the original black design until you replace it. Drop your image or
video into `[BG]` and delete the placeholder.

`?preview=1` paints a stand-in ground so the layout reads in a browser. That
never renders in OBS.

**The control server must be running or both Live Listen scenes render empty** —
the stage layers are browser sources pointing at `http://127.0.0.1:8722/stage`.

### Camera geometry is measured, not chosen

The rects in `config.json → layouts.live_listen` were read out of the live
layout via `window.__slots()` in `overlays/livelisten.html`, not typed by hand.
If you change the layout CSS, re-measure rather than editing the numbers.

Cameras are inset 6px inside their tiles. A square image's corners poke outside
a rounded rect until you inset past `r*(1 - 1/√2)` — 4.1px at the design's 14px
radius. 6px clears it and reads as a deliberate bezel. Because the tile is
1.776 and the camera is 1.778, you get about 4px more slack left/right than
top/bottom; at 1080p it is not visible.

### Editing the content

`overlays/livelisten.html` reads the same `/state` and `/events` endpoints as
everything else. Fields: `scene` (`two`/`solo`), `showName`, `episodeNumber`,
`episodeTitle`, `episodeBlurb`, `hostA`, `hostARole`, `hostB`, `hostBRole`,
`handle`, `cadence`, `viewerCount`, `alertName`, `alertMeta`, `messages`.

Add `?preview=1` to see the striped camera placeholders outside OBS.

### Older lower-third overlay

`overlays/episode.html` is the earlier simple lower third, still served at
`/overlay`. Unused by the stage; kept in case you want it on another scene.

`control/server.py` is stdlib-only (nothing to install) and binds to `127.0.0.1`,
so it isn't reachable off this machine. Typing in the panel updates the overlay
instantly over Server-Sent Events — no source refresh, no flicker on stream.
`Enter` in any field toggles visibility. State survives a restart.

### Replacing the overlay with your Claude Design version

`overlays/episode.html` is a plain reference renderer, not a design. When your
version is ready, drop it in `overlays/`, point `config.json →
control_panel.episode_overlay_url` at it, and regenerate.

The only contract it must honor:

```js
fetch('/state')            // -> {episode, title, guest, visible}
new EventSource('/events') // -> same object on every change
```

That contract won't change. `overlays/theme.css` holds every color, size, and
timing as a CSS variable if you'd rather restyle than replace.

---

## Customizing

Everything is in `config.json`; re-run `build_scenes.py` after any edit. The
generator validates before writing, so a bad reference fails loudly instead of
producing a collection that loads blank.

- `layouts` — rects are `[x, y, width, height]` in 1920×1080 space. Sources are
  fitted *inside* the rect preserving aspect, so you can retune freely without
  stretching anyone's face.
- `scene_contents` — which scenes get chat and alerts. Currently all four.
- `transition.duration_ms` — 400 ms. Below ~250 ms the movement reads as a cut.

**Widget URLs go in `config.local.json`, not `config.json`.** `Script/` is a git
repo and your chat/alert widget URLs contain private tokens. `config.local.json`
is gitignored and deep-merges over `config.json`:

```json
{
  "overlays": {
    "chat_url": "https://streamlabs.com/widgets/chat-box/v1/YOUR_TOKEN",
    "alerts_url": "https://dashboard.twitch.tv/widgets/alertbox#YOUR_TOKEN"
  }
}
```

Until you add these, Chat and Alerts are created at the right size and position
but load `about:blank` — layout and Move matching are already correct.

---

## Not done / open items

- **Encoding untouched**, as you asked. Worth knowing: you're on x264 `veryfast`,
  2500 kbps, 1280×720/30 while a 4070 sits idle with NVENC AV1 available. That's
  a separate job whenever you want it.
- **Old collections untouched.** `Grotto`, `REDACTED Primary`, `Fireside`, and
  `Untitled` are all still there. Delete them once this is proven on a real
  stream, not before.
- **obs-websocket has `auth_required: false`** with a password stored but not
  enforced, listening on port 4455. Nothing here depends on it, but if Stream
  Deck connects over websocket you may want to turn auth on in
  **Tools → WebSocket Server Settings** and update Stream Deck to match.
- **`media/starting-soon.mp4` doesn't exist yet.** The Countdown source points
  there and shows empty until you drop the video in. Its audio is routed to the
  stream so your music comes through.
