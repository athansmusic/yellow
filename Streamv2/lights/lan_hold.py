"""Hold a colour on a stuck H6076 by out-writing its black-writer.

Why this exists: the floor lamps at .84/.85 have corrupt firmware state - an
internal process rewrites black several times a second and every normal
command handler (app, LAN JSON, single raw ops) is dead. The ONE path that
still reaches the LEDs is a continuous stream of segmented-colour op-codes,
which is exactly how Music mode drives them. So this does what Music mode
does: streams the colour, ~30 times a second, until stopped.

Stopping the stream lets the black-writer win again, so the light goes dark
on its own - that IS the off switch.

This is a workaround, not a cure. The cure is Govee flashing the firmware
(warranty). Established by test on 2026-08-16.

usage:
    python lan_hold.py <ip[,ip2,...]> <r> <g> <b>   hold this colour until killed
    python lan_hold.py stop                          kill every running holder

One process can feed several lights. Starting a new holder first kills every
existing one, so the FLOOR-* launchers replace each other cleanly.
"""
import base64
import json
import os
import socket
import sys
import time
from pathlib import Path

CMD_PORT = 4003
# Rate versus the black-writer: 30Hz flickered, 50 barely, 80 settled it.
# Cost is still unmeasurable (~9 KB/s per light, CPU below noise).
HZ = 80
PID_DIR = Path(__file__).resolve().parent / "run"


def packet(r, g, b):
    """Segmented colour (mode 0x15, full-strip mask) - the op that works."""
    f = bytearray(20)
    f[0] = 0x33
    f[1] = 0x05
    for i, v in enumerate([0x15, 0x01, r, g, b, 0, 0, 0, 0, 0, 0xFF, 0x7F]):
        f[2 + i] = v
    chk = 0
    for v in f[:19]:
        chk ^= v
    f[19] = chk
    return json.dumps({"msg": {"cmd": "ptReal", "data": {
        "command": [base64.b64encode(bytes(f)).decode()]}}}).encode()


def stop_all():
    n = 0
    for pf in PID_DIR.glob("*.pid"):
        try:
            os.kill(int(pf.read_text().strip()), 9)
            n += 1
        except (OSError, ValueError):
            pass  # already gone
        pf.unlink(missing_ok=True)
    print(f"stopped {n} holder(s)")


def main():
    if len(sys.argv) == 2 and sys.argv[1] == "stop":
        stop_all()
        return
    if len(sys.argv) != 5:
        print(__doc__)
        sys.exit(1)

    ips = [i.strip() for i in sys.argv[1].split(",") if i.strip()]
    r, g, b = (max(0, min(255, int(v))) for v in sys.argv[2:5])

    PID_DIR.mkdir(exist_ok=True)
    stop_all()  # one holder at a time; launchers replace each other
    pidfile = PID_DIR / "holder.pid"
    pidfile.write_text(str(os.getpid()))

    pkt = packet(r, g, b)
    tx = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    print(f"holding ({r},{g},{b}) on {', '.join(ips)} at {HZ}Hz - kill me or "
          f"run 'lan_hold.py stop' to release")
    try:
        while True:
            for ip in ips:
                tx.sendto(pkt, (ip, CMD_PORT))
            time.sleep(1.0 / HZ)
    finally:
        tx.close()
        pidfile.unlink(missing_ok=True)


if __name__ == "__main__":
    main()
