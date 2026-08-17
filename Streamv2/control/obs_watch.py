"""OBS link: watches for stream start and the Starting Soon video ending.

Two jobs.

1. Stream start clears the per-stream credits list, and arms the startup chat
   counter. It fires on stream START rather than END deliberately: the credits
   roll is shown on the ending scene before you stop, so the on-screen result
   is identical, but an accidental stop or a reconnect cannot destroy a
   night's subscriber list, and Twitch will not resend those events.

2. When the Starting Soon countdown video finishes, hand over to the live
   scene and hide the video again so it re-arms for the next stream. OBS
   restarts a media source when it becomes active, so hiding it is all the
   reset that is needed.

This DOES send commands to OBS - switching scene and toggling that one source.
It touches nothing else: the scene and source names come from config, and no
other source is ever enumerated or modified.
"""

from __future__ import annotations

import base64
import hashlib
import json
import threading
import time

import websocket

# obs-websocket EventSubscription bitmask.
SUB_OUTPUTS = 1 << 6         # StreamStateChanged
SUB_MEDIA = 1 << 8           # MediaInputPlaybackEnded


class ObsLink(threading.Thread):
    daemon = True

    def __init__(self, host: str, port: int, password: str,
                 on_stream_start, on_video_end,
                 log=lambda *a: print(*a, flush=True)):
        super().__init__(name="obs-link")
        self.url = f"ws://{host}:{port}"
        self.password = password or ""
        self.on_stream_start = on_stream_start
        self.on_video_end = on_video_end
        self.log = log
        self._stop = threading.Event()
        self._ws = None
        self._send_lock = threading.Lock()
        self._req_id = 0

    def stop(self) -> None:
        self._stop.set()

    # -- outgoing ---------------------------------------------------------
    def request(self, request_type: str, data: dict | None = None) -> bool:
        """Fire a request. Returns False if OBS is not currently connected.

        Deliberately fire-and-forget: the reply arrives on the same socket the
        event loop is reading, and blocking here to correlate it would stall
        event handling for no benefit.
        """
        ws = self._ws
        if ws is None:
            return False
        with self._send_lock:
            self._req_id += 1
            try:
                ws.send(json.dumps({"op": 6, "d": {
                    "requestType": request_type,
                    "requestId": f"link-{self._req_id}",
                    "requestData": data or {}}}))
                return True
            except Exception:                          # noqa: BLE001
                return False

    def set_filter_enabled(self, source: str, filter_name: str,
                           enabled: bool) -> bool:
        """SetSourceFilterEnabled takes names, not ids - no lookup needed."""
        return self.request("SetSourceFilterEnabled", {
            "sourceName": source, "filterName": filter_name,
            "filterEnabled": enabled})

    def set_scene(self, name: str) -> bool:
        return self.request("SetCurrentProgramScene", {"sceneName": name})

    def set_item_enabled(self, scene: str, source: str, enabled: bool) -> None:
        """Toggle one source in one scene, by name.

        Needs the numeric scene item id, which means a lookup - and the reply
        arrives on the event loop, not here. So this runs its own short-lived
        connection rather than trying to correlate a response mid-stream.
        """
        threading.Thread(target=self._toggle_worker,
                         args=(scene, source, enabled), daemon=True).start()

    def swap_audio(self, live_in_a: list[str], muted_in_a: list[str]) -> None:
        """Flip a group of inputs between two mute states, atomically-ish.

        State A: everything in live_in_a unmuted, everything in muted_in_a
        muted. State B is the exact inverse. Which way to flip is read from
        the FIRST input in live_in_a, so mashing the button can never drift
        the group out of sync - every press re-asserts all inputs from one
        source of truth.
        """
        threading.Thread(target=self._swap_audio_worker,
                         args=(list(live_in_a), list(muted_in_a)),
                         daemon=True).start()

    def _swap_audio_worker(self, live_in_a: list[str],
                           muted_in_a: list[str]) -> None:
        try:
            ws = websocket.create_connection(self.url, timeout=8)
            try:
                self._identify(ws, events=0)
                ws.send(json.dumps({"op": 6, "d": {
                    "requestType": "GetInputMute", "requestId": "s0",
                    "requestData": {"inputName": live_in_a[0]}}}))
                muted = None
                for _ in range(20):
                    msg = json.loads(ws.recv())
                    if msg.get("op") == 7 and msg["d"]["requestId"] == "s0":
                        if msg["d"]["requestStatus"]["result"]:
                            muted = msg["d"]["responseData"]["inputMuted"]
                        break
                if muted is None:
                    self.log(f"  [obs] swap: {live_in_a[0]!r} not found")
                    return
                # Indicator unmuted = currently state A -> go to B, and back.
                to_b = not muted
                plan = ([(n, to_b) for n in live_in_a]
                        + [(n, not to_b) for n in muted_in_a])
                for i, (name, mute) in enumerate(plan):
                    ws.send(json.dumps({"op": 6, "d": {
                        "requestType": "SetInputMute", "requestId": f"s{i + 1}",
                        "requestData": {"inputName": name,
                                        "inputMuted": mute}}}))
                self.log(f"  [obs] audio swap -> {'B' if to_b else 'A'}: "
                         + ", ".join(f"{n} {'muted' if m else 'live'}"
                                     for n, m in plan))
                time.sleep(0.3)
            finally:
                ws.close()
        except Exception as exc:                       # noqa: BLE001
            self.log(f"  [obs] audio swap failed: {type(exc).__name__}: {exc}")

    def _toggle_worker(self, scene: str, source: str, enabled: bool) -> None:
        try:
            ws = websocket.create_connection(self.url, timeout=8)
            try:
                self._identify(ws, events=0)
                ws.send(json.dumps({"op": 6, "d": {
                    "requestType": "GetSceneItemId", "requestId": "t1",
                    "requestData": {"sceneName": scene, "sourceName": source}}}))
                item_id = None
                for _ in range(20):
                    msg = json.loads(ws.recv())
                    if msg.get("op") == 7 and msg["d"]["requestId"] == "t1":
                        if msg["d"]["requestStatus"]["result"]:
                            item_id = msg["d"]["responseData"]["sceneItemId"]
                        break
                if item_id is None:
                    self.log(f"  [obs] {source!r} not found in {scene!r}")
                    return
                ws.send(json.dumps({"op": 6, "d": {
                    "requestType": "SetSceneItemEnabled", "requestId": "t2",
                    "requestData": {"sceneName": scene, "sceneItemId": item_id,
                                    "sceneItemEnabled": enabled}}}))
                time.sleep(0.3)
            finally:
                ws.close()
        except Exception as exc:                       # noqa: BLE001
            self.log(f"  [obs] toggle failed: {type(exc).__name__}: {exc}")

    # -- connection -------------------------------------------------------
    def _identify(self, ws, events: int) -> None:
        hello = json.loads(ws.recv())
        ident: dict = {"rpcVersion": 1, "eventSubscriptions": events}
        auth = hello.get("d", {}).get("authentication")
        if auth:
            secret = base64.b64encode(hashlib.sha256(
                (self.password + auth["salt"]).encode()).digest())
            ident["authentication"] = base64.b64encode(hashlib.sha256(
                secret + auth["challenge"].encode()).digest()).decode()
        ws.send(json.dumps({"op": 1, "d": ident}))
        ws.recv()                                       # Identified

    def run(self) -> None:
        backoff = 5
        while not self._stop.is_set():
            try:
                self._session()
                backoff = 5
            except Exception as exc:                    # noqa: BLE001
                self.log(f"  [obs] {type(exc).__name__}: {exc}")
            finally:
                self._ws = None
            if self._stop.is_set():
                break
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    def _session(self) -> None:
        ws = websocket.create_connection(self.url, timeout=10)
        try:
            self._identify(ws, SUB_OUTPUTS | SUB_MEDIA)
            self._ws = ws
            self.log("  [obs] connected - watching stream state and media")
            ws.settimeout(None)
            while not self._stop.is_set():
                msg = json.loads(ws.recv())
                if msg.get("op") != 5:
                    continue
                d = msg["d"]
                kind = d.get("eventType")
                data = d.get("eventData", {})

                if kind == "StreamStateChanged":
                    if data.get("outputState") == "OBS_WEBSOCKET_OUTPUT_STARTED":
                        self.log("  [obs] stream started")
                        self.on_stream_start()

                elif kind == "MediaInputPlaybackEnded":
                    self.on_video_end(data.get("inputName", ""))
        finally:
            self._ws = None
            try:
                ws.close()
            except Exception:
                pass
