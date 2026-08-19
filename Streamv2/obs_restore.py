"""Compare OBS against obs-snapshot.json, and put things back.

The snapshot on its own only tells you something moved. This turns it
into an undo.

    python obs_restore.py                 show differences, change nothing
    python obs_restore.py --apply         restore transforms and visibility
    python obs_restore.py --apply --only "Live Listen Duo"
    python obs_restore.py --snapshot      overwrite the snapshot with now

DRY RUN IS THE DEFAULT. Nothing is written without --apply, because a
restore is itself a change and the whole point of this file is to stop
changes nobody asked for.

What it restores: scene item position, scale, bounds, crop and
visibility. What it deliberately does NOT touch: sources that exist now
but not in the snapshot (they are probably new work), sources in the
snapshot that are gone now (deleting is a decision, not a drift), scene
creation, and every input setting. Layout only.
"""
from __future__ import annotations

import argparse
import json
import time
from pathlib import Path

import websocket

HERE = Path(__file__).resolve().parent
LEGACY_SNAP = HERE / "obs-snapshot.json"


def snap_path(obs: "Obs") -> Path:
    """One snapshot file PER SCENE COLLECTION.

    Two shows share this machine now; running --snapshot on the NEED TO
    KNOW collection must never clobber the REDACTED restore point. The
    pre-existing obs-snapshot.json is migrated (renamed) to the current
    collection's file the first time this runs, since it was taken from
    the only collection that existed back then.
    """
    d, st = obs.req("GetSceneCollectionList")
    name = (d or {}).get("currentSceneCollectionName", "") if st["result"] else ""
    safe = "".join(c if c.isalnum() or c in "-_ " else "_" for c in name).strip()
    if not safe:
        return LEGACY_SNAP
    per = HERE / f"obs-snapshot.{safe}.json"
    if not per.exists() and LEGACY_SNAP.exists():
        LEGACY_SNAP.rename(per)
        print(f"(migrated obs-snapshot.json -> {per.name})")
    return per
KEYS = ("positionX", "positionY", "scaleX", "scaleY",
        "boundsType", "boundsAlignment", "boundsWidth", "boundsHeight",
        "cropLeft", "cropRight", "cropTop", "cropBottom", "alignment")


class Obs:
    def __init__(self, host="127.0.0.1", port=4455):
        self.ws = websocket.create_connection(f"ws://{host}:{port}", timeout=15)
        self.ws.recv()
        self.ws.send(json.dumps({"op": 1, "d": {"rpcVersion": 1}}))
        self.ws.recv()
        self.n = 0

    def req(self, kind, data=None):
        self.n += 1
        rid = str(self.n)
        self.ws.send(json.dumps({"op": 6, "d": {
            "requestType": kind, "requestId": rid, "requestData": data or {}}}))
        while True:
            m = json.loads(self.ws.recv())
            if m["op"] == 7 and m["d"]["requestId"] == rid:
                return m["d"].get("responseData"), m["d"]["requestStatus"]

    def close(self):
        try:
            self.ws.close()
        except Exception:                                  # noqa: BLE001
            pass


def take_snapshot(obs: Obs, snap_file: Path) -> None:
    snap = {"taken": time.strftime("%Y-%m-%d %H:%M:%S"), "scenes": {}, "inputs": {}}
    d, _ = obs.req("GetSceneList")
    snap["current_program_scene"] = d.get("currentProgramSceneName")
    for sc in [s["sceneName"] for s in d["scenes"]]:
        dd, s = obs.req("GetSceneItemList", {"sceneName": sc})
        if not s["result"]:
            continue
        snap["scenes"][sc] = [
            {"source": i["sourceName"], "index": i["sceneItemIndex"],
             "enabled": i["sceneItemEnabled"], "transform": i["sceneItemTransform"]}
            for i in sorted(dd["sceneItems"], key=lambda x: x["sceneItemIndex"])]
    d, _ = obs.req("GetInputList")
    for i in d["inputs"]:
        dd, s = obs.req("GetInputSettings", {"inputName": i["inputName"]})
        snap["inputs"][i["inputName"]] = {
            "kind": i["inputKind"],
            "settings": dd["inputSettings"] if s["result"] else {}}
        ff, fs = obs.req("GetSourceFilterList", {"sourceName": i["inputName"]})
        if fs["result"] and ff["filters"]:
            snap["inputs"][i["inputName"]]["filters"] = [
                {"name": f["filterName"], "kind": f["filterKind"],
                 "enabled": f["filterEnabled"], "settings": f["filterSettings"]}
                for f in ff["filters"]]
    snap_file.write_text(json.dumps(snap, indent=2), encoding="utf-8")
    print(f"snapshot written to {snap_file.name}: "
          f"{len(snap['scenes'])} scenes, {len(snap['inputs'])} inputs")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--apply", action="store_true", help="actually restore")
    ap.add_argument("--only", default=None, help="limit to one scene")
    ap.add_argument("--snapshot", action="store_true",
                    help="overwrite the snapshot with the current state")
    a = ap.parse_args()

    try:
        obs = Obs()
    except Exception as exc:                               # noqa: BLE001
        print(f"cannot reach OBS: {type(exc).__name__}. Is it open, with "
              f"obs-websocket enabled?")
        return 1

    snap_file = snap_path(obs)

    if a.snapshot:
        take_snapshot(obs, snap_file)
        obs.close()
        return 0

    if not snap_file.exists():
        print(f"no snapshot at {snap_file}. Run with --snapshot first.")
        obs.close()
        return 1
    snap = json.loads(snap_file.read_text(encoding="utf-8"))
    print(f"snapshot taken {snap['taken']}")
    print("DRY RUN - nothing will change\n" if not a.apply else "APPLYING\n")

    fixed = skipped = 0
    for sc, items in snap["scenes"].items():
        if a.only and sc != a.only:
            continue
        d, s = obs.req("GetSceneItemList", {"sceneName": sc})
        if not s["result"]:
            print(f"  {sc}: scene no longer exists - skipped (not recreating)")
            skipped += 1
            continue
        now = {i["sourceName"]: i for i in d["sceneItems"]}
        for old in items:
            name = old["source"]
            if name not in now:
                print(f"  {sc}: {name} is gone - skipped (deleting is a decision)")
                skipped += 1
                continue
            cur = now[name]
            ot, nt = old["transform"], cur["sceneItemTransform"]
            moved = [k for k in KEYS
                     if isinstance(ot.get(k), (int, float))
                     and abs(float(nt.get(k, 0)) - float(ot.get(k, 0))) > 0.5]
            vis = cur["sceneItemEnabled"] != old["enabled"]
            if not moved and not vis:
                continue
            print(f"  {sc}: {name}")
            for k in moved:
                print(f"      {k}: {nt.get(k)} -> {ot.get(k)}")
            if vis:
                print(f"      visible: {cur['sceneItemEnabled']} -> {old['enabled']}")
            fixed += 1
            if a.apply:
                tr = {k: ot[k] for k in KEYS if k in ot}
                # Bounds of zero mean "no bounds"; sending them back as a
                # bounds type would squash the source to nothing.
                if tr.get("boundsType") == "OBS_BOUNDS_NONE":
                    tr.pop("boundsWidth", None)
                    tr.pop("boundsHeight", None)
                obs.req("SetSceneItemTransform", {
                    "sceneName": sc, "sceneItemId": cur["sceneItemId"],
                    "sceneItemTransform": tr})
                if vis:
                    obs.req("SetSceneItemEnabled", {
                        "sceneName": sc, "sceneItemId": cur["sceneItemId"],
                        "sceneItemEnabled": old["enabled"]})

    print()
    if not fixed:
        print("nothing differs from the snapshot")
    elif a.apply:
        print(f"restored {fixed} item(s); {skipped} skipped by design")
    else:
        print(f"{fixed} item(s) differ; {skipped} skipped by design")
        print("run again with --apply to put them back")
    obs.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
