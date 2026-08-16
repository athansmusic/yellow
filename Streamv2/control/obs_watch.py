"""Watch OBS and clear the credits list when a new stream starts.

Subs are per STREAM, not per month, so the list has to be emptied between
streams. The reset fires on stream START rather than stream END, deliberately:

  - The credits roll is shown ON the ending scene, which happens before you
    stop the stream. Clearing at start gives an identical result on screen.
  - Clearing at start is safe against an accidental stop. If OBS drops, or a
    connection blips and you restart the output, an end-triggered reset would
    destroy the subscriber list you had been collecting all night. There is no
    way to get it back - Twitch will not resend those events.

So: the list is emptied the moment you go live, fills during the stream, is
shown at the end, and survives anything that happens in between.

Read-only towards OBS - it subscribes to output events and never sends a
command. Optional: if OBS is not running, everything else works unchanged.
"""

from __future__ import annotations

import json
import threading
import time

import websocket

# obs-websocket eventSubscriptions bitmask: Outputs.
EVENTSUB_OUTPUTS = 1 << 6


class ObsStreamWatcher(threading.Thread):
    daemon = True

    def __init__(self, host: str, port: int, password: str, on_stream_start,
                 log=lambda *a: print(*a, flush=True)):
        super().__init__(name="obs-watch")
        self.url = f"ws://{host}:{port}"
        self.password = password or ""
        self.on_stream_start = on_stream_start
        self.log = log
        self._stop = threading.Event()

    def stop(self) -> None:
        self._stop.set()

    def run(self) -> None:
        backoff = 5
        while not self._stop.is_set():
            try:
                self._session()
                backoff = 5
            except Exception as exc:                  # noqa: BLE001
                self.log(f"  [obs] {type(exc).__name__}: {exc}")
            if self._stop.is_set():
                break
            time.sleep(backoff)
            backoff = min(backoff * 2, 60)

    def _session(self) -> None:
        ws = websocket.create_connection(self.url, timeout=10)
        try:
            hello = json.loads(ws.recv())
            d = hello.get("d", {})
            ident: dict = {"rpcVersion": 1,
                           "eventSubscriptions": EVENTSUB_OUTPUTS}

            auth = d.get("authentication")
            if auth:
                # Only needed if obs-websocket has auth enabled.
                import base64
                import hashlib
                secret = base64.b64encode(hashlib.sha256(
                    (self.password + auth["salt"]).encode()).digest())
                ident["authentication"] = base64.b64encode(hashlib.sha256(
                    secret + auth["challenge"].encode()).digest()).decode()

            ws.send(json.dumps({"op": 1, "d": ident}))
            ws.recv()                                  # Identified
            self.log("  [obs] watching for stream start")

            ws.settimeout(None)
            while not self._stop.is_set():
                msg = json.loads(ws.recv())
                if msg.get("op") != 5:
                    continue
                data = msg["d"]
                if data.get("eventType") != "StreamStateChanged":
                    continue
                state = data.get("eventData", {}).get("outputState", "")
                if state == "OBS_WEBSOCKET_OUTPUT_STARTED":
                    self.log("  [obs] stream started - clearing credits")
                    self.on_stream_start()
        finally:
            try:
                ws.close()
            except Exception:
                pass
