#!/usr/bin/env python3
"""Fire one command at the Govee H617A over Bluetooth LE, then exit.

Connect-fire-disconnect by design. At this signal level the link survives
roughly ten seconds - plenty for a GATT write, far too short to hold open
between button presses. Every invocation is self-contained: scan, connect,
write, drop. Retries are automatic; a first attempt failing is normal here.

Expect 5-25 seconds per command until the PC's Bluetooth antenna is sorted.
That is entirely the radio, not this code - see NEXT-STEPS.md.

WHAT IS PROVEN ON THIS DEVICE
    on / off        confirmed visually
    solid / scene   confirmed by writing the mode and reading it back:
                      33 05 15 01  ->  device reports mode 0x15 (solid)
                      33 05 0A <n> ->  device reports mode 0x0A (scene n)

HOW COLOUR IS ACTUALLY DONE HERE
    Direct RGB does NOT work on this model. Five colour opcodes were tried and
    the device's own colour query returns a constant no matter what colour it
    is showing - blue and red gave byte-identical replies.

    Mode switching is the way in instead:
      solid      -> the strip returns to the last solid colour set in the app
      scene <id> -> the strip plays a stored scene

    So "blue" is `solid` (the app's stored solid colour) and "red" is
    `scene 134`. Both are stored ON THE DEVICE, which means editing them in
    the Govee app changes what these buttons do. Set them once, leave alone.

    The rgb/color commands below remain for experimentation but are unproven.

    python govee.py on
    python govee.py off
    python govee.py solid          back to solid colour (whatever the app set)
    python govee.py scene 134      scene by id
    python govee.py red            unproven, see above
    python govee.py color FF8800   unproven
    python govee.py brightness 60

Exit code 0 = command went out, 1 = gave up.
"""

from __future__ import annotations

import argparse
import asyncio
import sys
import time

from bleak import BleakClient, BleakScanner

ADDRESS = "C4:35:33:33:19:64"          # Govee_H617A_1964
CONTROL = "00010203-0405-0607-0809-0a0b0c0d2b11"

CMD_POWER = 0x01
CMD_BRIGHTNESS = 0x04
CMD_MODE = 0x05

MODE_SCENE = 0x0A
MODE_SOLID = 0x15

NAMED_COLORS = {
    "red":    (0xFF, 0x00, 0x00),
    "blue":   (0x00, 0x00, 0xFF),
    "green":  (0x00, 0xFF, 0x00),
    "yellow": (0xFF, 0xF2, 0x00),      # the [REDACTED] accent
    "purple": (0x91, 0x84, 0xD9),
    "white":  (0xFF, 0xFF, 0xFF),
    "warm":   (0xFF, 0xC8, 0x8C),
}


def packet(payload: bytes) -> bytes:
    """20 bytes: payload, zero-padded to 19, XOR checksum last."""
    body = payload.ljust(19, b"\x00")
    checksum = 0
    for b in body:
        checksum ^= b
    return body + bytes([checksum])


SOLID_MODE = packet(bytes([0x33, CMD_MODE, MODE_SOLID, 0x01]))


def build(action: str, value: str | None) -> tuple[str, list[bytes]]:
    """Return a label and the packets to send down a single connection."""
    if action == "on":
        return "ON", [packet(bytes([0x33, CMD_POWER, 0x01]))]
    if action == "off":
        return "OFF", [packet(bytes([0x33, CMD_POWER, 0x00]))]
    if action == "solid":
        return "SOLID MODE", [SOLID_MODE]
    if action == "scene":
        sid = int(value or 0, 0) & 0xFF
        return f"SCENE {sid}", [packet(bytes([0x33, CMD_MODE, MODE_SCENE, sid]))]
    if action == "brightness":
        level = max(0, min(100, int(value or 100)))
        return f"BRIGHTNESS {level}", [packet(bytes([0x33, CMD_BRIGHTNESS, level]))]

    if action == "color":
        raw = (value or "").lstrip("#")
        if len(raw) != 6:
            raise ValueError("color needs 6 hex digits, e.g. FF8800")
        rgb = tuple(int(raw[i:i + 2], 16) for i in (0, 2, 4))
        label = f"COLOR #{raw.upper()}"
    elif action in NAMED_COLORS:
        rgb = NAMED_COLORS[action]
        label = action.upper()
    else:
        raise ValueError(f"unknown command: {action}")

    # Force solid mode first - a strip sitting in a scene ignores colour.
    return label, [SOLID_MODE,
                   packet(bytes([0x33, CMD_MODE, MODE_SOLID, 0x01, *rgb]))]


async def send(packets: list[bytes], attempts: int, quiet: bool) -> bool:
    def say(msg: str) -> None:
        if not quiet:
            print(msg, flush=True)

    for n in range(1, attempts + 1):
        device = await BleakScanner.find_device_by_address(ADDRESS, timeout=12.0)
        if device is None:
            say(f"  attempt {n}: light not advertising")
            continue
        started = time.time()
        try:
            async with BleakClient(device, timeout=25.0) as client:
                # All packets down one connection; setup is the expensive part.
                for p in packets:
                    await client.write_gatt_char(CONTROL, p, response=False)
                    if len(packets) > 1:
                        await asyncio.sleep(0.4)
                say(f"  sent in {time.time() - started:.1f}s (attempt {n})")
                return True
        except Exception as exc:                      # noqa: BLE001
            say(f"  attempt {n} failed: {type(exc).__name__}")
    return False


def main() -> int:
    ap = argparse.ArgumentParser(description="Control the Govee H617A over BLE.")
    ap.add_argument("action", help="on | off | solid | scene <id> | brightness <0-100> | "
                                   + " | ".join(NAMED_COLORS) + " | color RRGGBB")
    ap.add_argument("value", nargs="?", help="for scene / colour / brightness")
    ap.add_argument("--attempts", type=int, default=4,
                    help="retries before giving up (default 4)")
    ap.add_argument("--quiet", action="store_true", help="no output")
    args = ap.parse_args()

    try:
        label, packets = build(args.action.lower(), args.value)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    if not args.quiet:
        print(f"{label}  ->  " + "  ".join(p.hex() for p in packets))
    ok = asyncio.run(send(packets, args.attempts, args.quiet))
    if not args.quiet:
        print("done" if ok else "gave up - press the button again")
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
