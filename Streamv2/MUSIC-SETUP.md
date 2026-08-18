# Live music on stream — signal flow, latency, and the hand-controlled synth

Written 2026-08-18. Design only; nothing here is built yet.

The hand-tracking toy is the easy half. The hard half is singing live with
a vocal chain, over a backing track, on stream, without any of it drifting
or feeling laggy to perform to. This document is mostly about that.

## What is already on this machine

| Piece | Notes |
|---|---|
| Focusrite USB ASIO | the low-latency interface driver — this is the one to perform on |
| BEACN Mix Create | currently owns the stream mix (Audience Mix, Show, Mic/Aux) |
| BEACN ASIO | exists, but do not use it as the DAW device — see "two clocks" below |
| FL Studio (Image-Line) | the DAW; vocal chain and backing live here |
| VB-Audio Virtual Cable | the route from FL Studio into OBS |
| LoopBe1 | MIDI cable for the hand tracker (proven working) |
| REAPER | present, unused for this |

## The three latency paths, and why only one of them matters

Beginners treat "latency" as one number. There are three, and they have
completely different budgets:

1. **Voice → your own ears (monitoring).** This is the ONLY one that
   affects whether you can sing. Above ~12ms it starts to feel wrong;
   above ~20ms it is unusable. Budget: **under 10ms**.
2. **Voice → the stream.** Viewers cannot tell 10ms from 80ms. What they
   CAN tell is audio that does not match your lips. Budget: whatever it
   is, as long as video is offset to match.
3. **Hand → synth parameter.** A control signal, ~30-40ms. It never
   enters the vocal audio path, so it **cannot** make singing feel
   laggy. Fine for filter sweeps and intensity; noticeable if mapped to
   note triggers, so do not map it to triggers.

The mistake to avoid is optimising 2 and 3 at the expense of 1.

## Recommended signal flow

```
   mic ──> Focusrite ──ASIO──> FL STUDIO ─┬─> Focusrite headphone out   (you hear: ~8ms)
                                          │
                    backing track ────────┤   (same master = sample-locked)
                                          │
                                          └─> VB-Cable ──> OBS source   (stream hears)
```

The two rules that make this work:

- **Everything that must stay in sync lives inside FL Studio's master.**
  Vocal and backing leave together, through one cable, already mixed. They
  cannot drift from each other because they were never separate.
- **Your monitoring never goes through VB-Cable.** You hear the Focusrite
  directly off FL's output. The stream's extra latency is the stream's
  problem, not yours.

### Why not run the vocal chain on the BEACN

The BEACN has onboard DSP and near-zero monitoring latency, which is
genuinely tempting. Use it if you only want compression and a little
reverb. Use FL Studio if you want your actual plugin chain — tuning,
doubler, character EQ, sends. You cannot have both without stacking
latency, so pick per-show.

### Two clocks: the real long-stream risk

The Focusrite and the BEACN are separate USB audio devices with separate
clocks. Over an hour they drift by milliseconds. That is harmless as long
as nothing needs to stay sample-locked ACROSS the two - which is exactly
why the vocal and backing both live in FL's master rather than one on each
device.

**Set every device to 48000 Hz.** Windows, Focusrite Control, BEACN app,
FL Studio, VB-Cable, and OBS. A single 44100 in the chain causes either
resampling artefacts or slow drift, and it is miserable to diagnose later.

## FL Studio settings that matter

- **Audio device: Focusrite USB ASIO.** Not FL Studio ASIO, not BEACN.
- **Buffer: start at 128 samples** (~2.7ms at 48k). Drop to 64 if the CPU
  holds; go to 256 if you hear crackle. Watch FL's CPU meter while the
  full chain runs, not while idle.
- **On the monitored vocal chain, avoid anything with lookahead** -
  linear-phase EQ, mastering limiters, some de-essers. They add 5-20ms
  each and it compounds. Put those on the master bus AFTER the monitor
  split, or accept them only on the stream feed.
- Backing tracks as audio clips in the playlist, not a separate player
  app. A separate app is a second clock and a second thing to sync.

## Getting it into OBS

Add ONE new audio source: **VB-Audio Virtual Cable**, capturing FL's
output. This is additive - the existing BEACN sources (Audience Mix,
Show, Mic/Aux) are untouched, and the SHOW-MODE button keeps working
exactly as it does now.

Then, in OBS, **Advanced Audio Properties → Sync Offset** on that source.
Video from the camera is typically LATER than audio, so the audio usually
needs a positive offset (delay) to line up. Measure it, do not guess:
clap on camera, record locally, and look at the waveform against the
frame where your hands meet.

## The hand-controlled synth

Proven working already:

- `motion/tracker.py` — MediaPipe hand tracking, isolated in
  `.venv-motion` because the system mediapipe is broken against the
  installed protobuf
- MIDI out to `LoopBe Internal MIDI 1` — verified sending CC

Remaining design:

- Hand height → CC1 (or any CC) → LoopBe1 → FL Studio → right-click a
  knob → "Link to controller". FL makes this trivial.
- **Only runs on the music scene.** The control server already watches
  OBS scene changes; it starts the tracker on entering and kills it on
  leaving, so the camera is released and no CC is sent otherwise.
- **Failure behaviour: value fades to zero when the hand leaves frame.**
  A held value would leave a synth screaming with nobody in shot.
- Map it to something forgiving first - filter cutoff, reverb send,
  wavetable position. Not pitch, not note triggers, not anything where
  30ms reads as sloppy.

### Camera for the tracker

Open question. OBS's Virtual Camera is running but every candidate index
returned black frames to OpenCV's DirectShow backend - worth retrying
with the Media Foundation backend before concluding anything. The
alternatives are a second cheap webcam (best isolation) or sharing the
NVIDIA Broadcast device (untested, risks the live feed).

## Build order

1. Prove the audio path with no hand tracking at all: FL → VB-Cable →
   OBS, monitoring off the Focusrite, sync offset measured. This is the
   part that has to be right.
2. Add the tracker on its own camera, MIDI to LoopBe1, mapped to one
   forgiving parameter.
3. Scene-gate the tracker so it only runs where it should.
4. Only then: gesture vocabulary, on-screen visualisation of the value.
