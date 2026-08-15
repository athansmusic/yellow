#!/usr/bin/env python3
"""Generate an OBS scene collection from config.json.

Why a generator instead of clicking around in OBS: the whole point of the
rebuild is that sources are defined ONCE and composed into scenes. Keeping that
invariant by hand across four scenes is exactly how the old collection grew to
269 sources. Here it is structural - there is one [CAM], one Chat, one Alerts,
and the scenes only describe where they sit.

Output is written in the pre-migration (v1) collection format: absolute
positions, no pos_rel/scale_ref. OBS 30+ computes the relative coordinates
itself on first load and re-saves as version 2. That is deliberate - deriving
OBS's relative-coordinate math by hand is a good way to ship subtly wrong
layouts.

Usage:
    python build_scenes.py
    python build_scenes.py --out dist/Rebuild.json
"""

from __future__ import annotations

import argparse
import json
import sys
import uuid
from pathlib import Path
from typing import Any

HERE = Path(__file__).resolve().parent

# Stable namespace so re-running the generator produces the SAME uuids. Without
# this, every rebuild would look like a brand new set of sources to OBS.
NS = uuid.UUID("6f2a9c14-3b7e-5d81-9a4f-2c8e10b5d733")

# OBS alignment flags: TOP(1) | LEFT(4).
ALIGN_TOPLEFT = 5
# OBS_BOUNDS_SCALE_INNER - fit inside the box, preserve aspect ratio.
BOUNDS_SCALE_INNER = 2

# Scene names. Kept in one place because the hotkey map and the README both
# depend on them matching exactly.
S_STARTING = "Starting Soon"
S_LIVE = "Live"
S_GAME = "In Game"
S_LISTEN = "Live Listen"
S_LISTEN_SOLO = "Live Listen Solo"
SCENE_ORDER = [S_STARTING, S_LIVE, S_GAME, S_LISTEN, S_LISTEN_SOLO]

CAM_SCENE = "[CAM]"
CAM_RAW = "Cam Raw"
GUEST = "[GUEST]"
CHAT = "Chat"
ALERTS = "Alerts"
EPISODE = "Episode Info"
COUNTDOWN = "Countdown"
GAME_CAPTURE = "Game Capture"
# Each Live Listen scene gets its OWN pair of stage layers, pinned to a layout
# via ?scene=. Sharing one pair would mean both OBS scenes rendered whatever
# the shared state said, so switching scenes moved the camera but not the layout.
STAGE_BACK = "Stage Back"
STAGE_FRONT = "Stage Front"
STAGE_BACK_SOLO = "Stage Back Solo"
STAGE_FRONT_SOLO = "Stage Front Solo"

# Shared background, same trick as [CAM]: one nested scene used by both Live
# Listen scenes, so you point ONE source at your artwork instead of maintaining
# two, and Move holds it dead still when cutting between two-shot and solo.
BG_SCENE = "[BG]"
BG_PLACEHOLDER = "BG Placeholder"

# The [REDACTED] house style has zero border radius, so a square camera fills
# a square tile exactly and no inset is needed. (The previous rounded design
# needed 6px so the camera's corners did not poke outside the 14px radius.)
TILE_INSET = 0


def inset(rect: list[int], by: int = TILE_INSET) -> list[int]:
    x, y, w, h = rect
    return [x + by, y + by, w - by * 2, h - by * 2]


def uid(name: str) -> str:
    return str(uuid.uuid5(NS, name))


def deep_merge(base: dict, over: dict) -> dict:
    """Merge config.local.json over config.json, recursing into dicts."""
    out = dict(base)
    for k, v in over.items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def load_config() -> dict:
    cfg = json.loads((HERE / "config.json").read_text(encoding="utf-8"))
    local = HERE / "config.local.json"
    if local.exists():
        cfg = deep_merge(cfg, json.loads(local.read_text(encoding="utf-8")))
        print("  merged config.local.json")
    return cfg


def strip_notes(d: Any) -> Any:
    """Drop the _note / _readme documentation keys before they reach OBS."""
    if isinstance(d, dict):
        return {k: strip_notes(v) for k, v in d.items() if not k.startswith("_")}
    if isinstance(d, list):
        return [strip_notes(x) for x in d]
    return d


def make_filter(name: str, fid: str, settings: dict, enabled: bool = True,
                versioned_id: str | None = None) -> dict:
    return {
        "name": name,
        "uuid": uid(f"filter:{name}"),
        "id": fid,
        "versioned_id": versioned_id or fid,
        "settings": settings,
        "mixers": 0,
        "sync": 0,
        "flags": 0,
        "volume": 1.0,
        "balance": 0.5,
        "enabled": enabled,
        "muted": False,
        "push-to-mute": False,
        "push-to-mute-delay": 0,
        "push-to-talk": False,
        "push-to-talk-delay": 0,
        "hotkeys": {},
        "deinterlace_mode": 0,
        "deinterlace_field_order": 0,
        "monitoring_type": 0,
        "private_settings": {},
    }


def make_source(name: str, sid: str, settings: dict, *, filters: list | None = None,
                hotkeys: dict | None = None, mixers: int = 0, volume: float = 1.0,
                muted: bool = False, monitoring_type: int = 0, flags: int = 0,
                versioned_id: str | None = None) -> dict:
    return {
        "name": name,
        "uuid": uid(name),
        "id": sid,
        "versioned_id": versioned_id or sid,
        "settings": settings,
        "mixers": mixers,
        "sync": 0,
        "flags": flags,
        "volume": volume,
        "balance": 0.5,
        "enabled": True,
        "muted": muted,
        "push-to-mute": False,
        "push-to-mute-delay": 0,
        "push-to-talk": False,
        "push-to-talk-delay": 0,
        "hotkeys": hotkeys or {},
        "deinterlace_mode": 0,
        "deinterlace_field_order": 0,
        "monitoring_type": monitoring_type,
        "filters": filters or [],
        "private_settings": {},
    }


def make_item(source_name: str, item_id: int, rect: list[int], *, visible: bool = True,
              locked: bool = False) -> dict:
    """Place a source inside `rect` (x, y, w, h), fitted and aspect-preserved."""
    x, y, w, h = rect
    return {
        "name": source_name,
        "source_uuid": uid(source_name),
        "visible": visible,
        "locked": locked,
        "rot": 0.0,
        "align": ALIGN_TOPLEFT,
        "bounds_type": BOUNDS_SCALE_INNER,
        "bounds_align": 0,
        "bounds_crop": False,
        "crop_left": 0,
        "crop_top": 0,
        "crop_right": 0,
        "crop_bottom": 0,
        "id": item_id,
        "group_item_backup": False,
        "pos": {"x": float(x), "y": float(y)},
        "scale": {"x": 1.0, "y": 1.0},
        "bounds": {"x": float(w), "y": float(h)},
        "scale_filter": "disable",
        "blend_method": "default",
        "blend_type": "normal",
        "show_transition": {"duration": 0},
        "hide_transition": {"duration": 0},
        "private_settings": {},
    }


def make_scene(name: str, items: list[dict], *, select_hotkey: str | None = None,
               extra_hotkeys: dict | None = None) -> dict:
    hotkeys: dict[str, list] = {
        "OBSBasic.SelectScene": [{"key": select_hotkey}] if select_hotkey else []
    }
    # OBS needs a show/hide hotkey slot per item id, even when unbound.
    for it in items:
        hotkeys.setdefault(f"libobs.show_scene_item.{it['id']}", [])
        hotkeys.setdefault(f"libobs.hide_scene_item.{it['id']}", [])
    if extra_hotkeys:
        hotkeys.update(extra_hotkeys)

    src = make_source(
        name,
        "scene",
        {"id_counter": len(items), "custom_size": False, "items": items},
        hotkeys=hotkeys,
    )
    # Scenes carry no filters key in OBS's own output; harmless but keep it tidy.
    src.pop("filters", None)
    return src


def build(cfg: dict) -> dict:
    canvas = cfg["canvas"]
    lay = strip_notes(cfg["layouts"])
    dev = strip_notes(cfg["devices"])
    ov = strip_notes(cfg["overlays"])
    panel = strip_notes(cfg["control_panel"])
    hk = strip_notes(cfg["hotkeys"])
    contents = strip_notes(cfg["scene_contents"])

    sources: list[dict] = []

    # ---- Device layer -----------------------------------------------------
    # One physical camera open. Cam Keyed is a source-clone of it, so the
    # device is not opened twice and the two can carry different filter chains.
    sources.append(make_source(
        CAM_RAW, "dshow_input",
        {
            "video_device_id": dev["camera"]["video_device_id"],
            "resolution": dev["camera"].get("resolution", "1920x1080"),
            "res_type": dev["camera"].get("res_type", 1),
            "active": True,
        },
        filters=[
            make_filter("Color Correction", "color_filter", {}, versioned_id="color_filter_v2"),
            make_filter("Sharpen", "sharpness_filter", {"sharpness": 0.05}),
        ],
    ))

    sources.append(make_source(
        GUEST, "dshow_input",
        {
            "video_device_id": dev["guest_camera"]["video_device_id"],
            "resolution": dev["guest_camera"].get("resolution", "1920x1080"),
            "res_type": dev["guest_camera"].get("res_type", 1),
            "active": True,
        },
    ))

    sources.append(make_source(
        GAME_CAPTURE, "game_capture",
        {"capture_mode": "any_fullscreen", "capture_cursor": False},
    ))

    countdown = cfg["media"]["countdown_video"]
    sources.append(make_source(
        COUNTDOWN, "ffmpeg_source",
        {
            "local_file": countdown["path"],
            "looping": bool(countdown.get("loop", True)),
            "hw_decode": True,
            "close_when_inactive": True,
            "restart_on_activate": True,
        },
        hotkeys={
            "libobs.mute": [], "libobs.unmute": [],
            "libobs.push-to-mute": [], "libobs.push-to-talk": [],
            "MediaSource.Restart": [], "MediaSource.Play": [],
            "MediaSource.Pause": [], "MediaSource.Stop": [],
        },
        # Route countdown audio to the stream so your video's music is heard.
        mixers=255, volume=1.0,
    ))

    # ---- Shared overlays --------------------------------------------------
    def browser(name: str, url: str, w: int, h: int) -> dict:
        return make_source(name, "browser_source", {
            "url": url or "about:blank",
            "width": w,
            "height": h,
            "reroute_audio": False,
            # Keeps chat/alerts from silently dying after hours of uptime.
            "restart_when_active": False,
            "shutdown": False,
        })

    chat_rect = lay["chat"]
    sources.append(browser(CHAT, ov.get("chat_url", ""), chat_rect[2], chat_rect[3]))
    sources.append(browser(ALERTS, ov.get("alerts_url", ""), canvas["width"], canvas["height"]))

    episode_url = panel.get("episode_overlay_url") or \
        f"http://{panel['host']}:{panel['port']}/overlay"
    sources.append(browser(EPISODE, episode_url, canvas["width"], canvas["height"]))

    # The Live Listen stage renders as two layers with the cameras sandwiched
    # between them. One layer cannot work: the design paints a full-canvas
    # background, which would bury the cameras underneath it.
    stage = f"http://{panel['host']}:{panel['port']}/stage"
    for name, layer, scene in (
        (STAGE_BACK, "back", "two"),
        (STAGE_FRONT, "front", "two"),
        (STAGE_BACK_SOLO, "back", "solo"),
        (STAGE_FRONT_SOLO, "front", "solo"),
    ):
        sources.append(browser(name, f"{stage}?layer={layer}&scene={scene}",
                               canvas["width"], canvas["height"]))

    # ---- [CAM]: the reason transitions look smooth ------------------------
    # Every composition scene references THIS scene, so Move Transition sees one
    # source named "[CAM]" in both the outgoing and incoming scene and
    # interpolates its geometry instead of cross-fading two unrelated sources.
    # Keyed/unkeyed is a visibility flip inside, driven by a Stream Deck button.
    full = [0, 0, canvas["width"], canvas["height"]]
    sources.append(make_scene(CAM_SCENE, [make_item(CAM_RAW, 1, full)]))

    # [BG] ships with a flat #090909 fill so the stage looks like the original
    # black design if you never replace it. Drop your image or video into this
    # scene and delete the placeholder.
    sources.append(make_source(BG_PLACEHOLDER, "color_source",
                               {"color": 4278782217,
                                "width": canvas["width"], "height": canvas["height"]},
                               versioned_id="color_source_v3"))
    sources.append(make_scene(BG_SCENE, [make_item(BG_PLACEHOLDER, 1, full)]))

    # ---- Composition scenes ----------------------------------------------
    def with_overlays(scene_name: str, items: list[dict]) -> list[dict]:
        """Append chat/alerts last so they render on top."""
        want = contents.get(scene_name, {})
        nxt = len(items) + 1
        if want.get("chat"):
            items.append(make_item(CHAT, nxt, lay["chat"]))
            nxt += 1
        if want.get("alerts"):
            items.append(make_item(ALERTS, nxt, lay["alerts"]))
        return items

    scenes = []

    scenes.append(make_scene(S_STARTING, with_overlays(S_STARTING, [
        make_item(COUNTDOWN, 1, lay["starting_soon"]["countdown"]),
    ]), select_hotkey=hk["scene_starting_soon"]))

    # Live is deliberately bare: camera, chat, alerts. Nothing else.
    scenes.append(make_scene(S_LIVE, with_overlays(S_LIVE, [
        make_item(CAM_SCENE, 1, lay["live"]["cam"]),
    ]), select_hotkey=hk["scene_live"]))

    scenes.append(make_scene(S_GAME, with_overlays(S_GAME, [
        make_item(GAME_CAPTURE, 1, lay["in_game"]["game"]),
        make_item(CAM_SCENE, 2, lay["in_game"]["cam"]),
    ]), select_hotkey=hk["scene_in_game"]))

    # Live Listen: the stage design owns the geometry. These rects were MEASURED
    # from overlays/livelisten.html, then inset so the cameras' square corners
    # sit inside the tiles' 14px radius. Stage Back paints under the cameras,
    # Stage Front puts the nameplates and tile edges over them.
    ll = lay["live_listen"]
    scenes.append(make_scene(S_LISTEN, with_overlays(S_LISTEN, [
        make_item(BG_SCENE, 1, lay["episode"]),
        make_item(STAGE_BACK, 2, lay["episode"]),
        make_item(CAM_SCENE, 3, inset(ll["two"]["camA"])),
        make_item(GUEST, 4, inset(ll["two"]["camB"])),
        make_item(STAGE_FRONT, 5, lay["episode"]),
    ]), select_hotkey=hk["scene_live_listen"]))

    # Same source names, different geometry -> Move slides Cam A from the
    # 872x491 tile up to 1400x788 instead of cross-fading.
    scenes.append(make_scene(S_LISTEN_SOLO, with_overlays(S_LISTEN_SOLO, [
        make_item(BG_SCENE, 1, lay["episode"]),
        make_item(STAGE_BACK_SOLO, 2, lay["episode"]),
        make_item(CAM_SCENE, 3, inset(ll["solo"]["camA"])),
        make_item(STAGE_FRONT_SOLO, 4, lay["episode"]),
    ]), select_hotkey=hk["scene_live_listen_solo"]))

    sources.extend(scenes)

    # ---- Collection-level audio ------------------------------------------
    # Mic lives here, not in a scene, so it is always live and there is exactly
    # one of it. mixers=255 -> present on all six audio tracks.
    mic = make_source("Mic/Aux", "wasapi_input_capture",
                      {"device_id": dev["mic"]["device_id"]},
                      mixers=255, flags=2, monitoring_type=0,
                      hotkeys={"libobs.mute": [], "libobs.unmute": [],
                               "libobs.push-to-mute": [], "libobs.push-to-talk": []})
    mic.pop("filters", None)

    desktop = make_source("Desktop Audio", "wasapi_output_capture",
                          {"device_id": dev["desktop_audio"]["device_id"]},
                          mixers=255, flags=2, monitoring_type=0,
                          hotkeys={"libobs.mute": [], "libobs.unmute": [],
                                   "libobs.push-to-mute": [], "libobs.push-to-talk": []})
    desktop.pop("filters", None)

    tr = cfg["transition"]
    return {
        "name": cfg["collection_name"],
        "current_scene": S_LIVE,
        "current_program_scene": S_LIVE,
        "scene_order": [{"name": n} for n in SCENE_ORDER],
        "sources": sources,
        "groups": [],
        "quick_transitions": [
            {"name": "Cut", "duration": 300, "hotkeys": [], "id": 1, "fade_to_black": False},
            {"name": "Fade", "duration": 300, "hotkeys": [], "id": 2, "fade_to_black": False},
        ],
        "transitions": [{
            "name": "Move",
            "id": "move_transition",
            "settings": {
                # "None" = matched sources purely MOVE with no crossfade. That is
                # the look you want; the crossfade is only for unmatched items.
                "transition_match": "None",
                "transition_in": "Fade",
                "transition_out": "Fade",
                "position_in": 1,
                "position_out": 1,
            },
        }],
        "current_transition": tr["name"],
        "transition_duration": tr["duration_ms"],
        "AuxAudioDevice1": mic,
        "DesktopAudioDevice1": desktop,
        "preview_locked": False,
        "scaling_enabled": False,
        "scaling_level": 0,
        "scaling_off_x": 0.0,
        "scaling_off_y": 0.0,
        "virtual-camera": {"type2": 3},
        "modules": {},
        "resolution": {"x": canvas["width"], "y": canvas["height"]},
    }


def validate(coll: dict) -> list[str]:
    """Catch the mistakes that make OBS load a blank or broken collection."""
    problems = []
    by_name = {s["name"]: s for s in coll["sources"]}
    uuids: dict[str, str] = {}

    for s in coll["sources"]:
        if s["uuid"] in uuids and uuids[s["uuid"]] != s["name"]:
            problems.append(f"uuid collision: {s['name']} vs {uuids[s['uuid']]}")
        uuids[s["uuid"]] = s["name"]

    for s in coll["sources"]:
        if s["id"] != "scene":
            continue
        for it in s["settings"]["items"]:
            if it["name"] not in by_name:
                problems.append(f"scene '{s['name']}' references missing source '{it['name']}'")
            elif by_name[it["name"]]["uuid"] != it["source_uuid"]:
                problems.append(f"scene '{s['name']}' item '{it['name']}' has a stale uuid")

    for entry in coll["scene_order"]:
        if entry["name"] not in by_name:
            problems.append(f"scene_order lists missing scene '{entry['name']}'")

    # The whole design rests on [CAM] being one shared source across scenes.
    using_cam = [s["name"] for s in coll["sources"] if s["id"] == "scene"
                 and any(i["name"] == CAM_SCENE for i in s["settings"]["items"])]
    if len(using_cam) < 2:
        problems.append(f"[CAM] is only used in {using_cam} - Move has nothing to match")

    return problems


def find_installed(collection_name: str) -> Path | None:
    """Locate the live copy of this collection inside OBS's own scenes folder."""
    import os
    appdata = os.environ.get("APPDATA")
    if not appdata:
        return None
    scenes = Path(appdata) / "obs-studio" / "basic" / "scenes"
    # OBS sanitises the collection name into the filename.
    safe = "".join(c if c.isalnum() or c in " -_" else "_" for c in collection_name)
    for cand in (scenes / f"{collection_name}.json", scenes / f"{safe}.json"):
        if cand.exists():
            return cand
    return None


def preserve_modules(coll: dict, src: Path | None) -> None:
    """Carry plugin config (Advanced Scene Switcher macros, etc.) forward.

    Plugins like Advanced Scene Switcher store their entire config INSIDE the
    scene collection, under "modules". Anything you build in the ASS GUI would
    be destroyed by the next re-import if we emitted an empty modules block.
    So: read the live collection, keep its modules, write them back out.
    """
    if not src or not src.exists():
        return
    try:
        live = json.loads(src.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError) as exc:
        print(f"  ! could not read {src.name} to preserve modules: {exc}")
        return

    modules = live.get("modules")
    if not modules:
        return
    coll["modules"] = modules

    ass = modules.get("advanced-scene-switcher") or {}
    macros = ass.get("macros") or []
    print(f"  preserved modules from {src.name}"
          + (f" ({len(macros)} Advanced Scene Switcher macro(s))" if macros else ""))
    for m in macros:
        print(f"      - {m.get('name')}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=None, help="output path (default dist/<collection>.json)")
    ap.add_argument("--preserve-modules", default=None, metavar="PATH",
                    help="collection to carry plugin config from "
                         "(default: the installed copy in OBS's scenes folder)")
    ap.add_argument("--no-preserve", action="store_true",
                    help="emit an empty modules block, discarding plugin config")
    args = ap.parse_args()

    cfg = load_config()
    coll = build(cfg)

    if not args.no_preserve:
        src = Path(args.preserve_modules) if args.preserve_modules \
            else find_installed(cfg["collection_name"])
        preserve_modules(coll, src)

    problems = validate(coll)
    if problems:
        print("VALIDATION FAILED:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1

    out = Path(args.out) if args.out else HERE / "dist" / f"{cfg['collection_name']}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(coll, indent=1), encoding="utf-8")

    scenes = [s for s in coll["sources"] if s["id"] == "scene"]
    print(f"\n  wrote {out}")
    print(f"  {len(scenes)} scenes, {len(coll['sources'])} sources "
          f"(was 30 scenes / 269 sources)")
    for s in scenes:
        items = ", ".join(i["name"] for i in s["settings"]["items"])
        print(f"    {s['name']:<16} {items}")
    print("\n  Import: OBS > Scene Collection > Import > pick this file.\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
