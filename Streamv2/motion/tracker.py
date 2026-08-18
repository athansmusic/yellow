"""Hand tracking -> a 0..127 value. STAGE ONE: no MIDI, no OBS changes.

Reads a camera, finds one hand, and turns its height into a number, drawn
big in a preview window so the tracking quality and the latency can be
judged before anything is wired to audio.

    python tracker.py --list          probe which camera indices work
    python tracker.py --index 2       track using that camera
    python tracker.py --index 2 --flip

Point it at the OBS Virtual Camera: no contention with the physical
device OBS already holds, and it sees exactly what is on stream.

Run it with the project venv, which has a working mediapipe:
    .venv-motion\\Scripts\\python.exe motion\\tracker.py --list

Q to quit.
"""
from __future__ import annotations

import argparse
import time
import warnings

warnings.filterwarnings("ignore")

import cv2                                    # noqa: E402
import mediapipe as mp                        # noqa: E402


def probe(limit: int = 8) -> None:
    """Open each camera index briefly and report what answers.

    Deliberately opens and closes one at a time: holding several capture
    devices at once is a good way to upset whatever else is using them.
    """
    print("probing camera indices (this takes a few seconds)...\n")
    for i in range(limit):
        cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)
        if not cap.isOpened():
            cap.release()
            continue
        ok, frame = cap.read()
        if ok and frame is not None:
            h, w = frame.shape[:2]
            print(f"  index {i}: WORKS  {w}x{h}")
        else:
            print(f"  index {i}: opened but gave no frame")
        cap.release()
        time.sleep(0.2)
    print("\nPick the one that is the OBS Virtual Camera and pass it as --index")


def run(index: int, flip: bool, show: bool = True) -> None:
    cap = cv2.VideoCapture(index, cv2.CAP_DSHOW)
    if not cap.isOpened():
        print(f"could not open camera index {index}. Try --list.")
        return
    # A smaller capture is plenty for tracking and keeps latency down; the
    # model runs on a 256px-ish crop internally anyway.
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 360)

    hands = mp.solutions.hands.Hands(
        static_image_mode=False, max_num_hands=1,
        model_complexity=0,                    # fastest; enough for position
        min_detection_confidence=0.6, min_tracking_confidence=0.5)
    draw = mp.solutions.drawing_utils

    value = 0.0          # smoothed 0..1
    ema = 0.35           # how fast the value chases the hand
    fps_t = time.time()
    frames = 0
    fps = 0.0
    last_seen = 0.0

    print("tracking. raise and lower your hand. Q to quit.\n")
    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                continue
            if flip:
                frame = cv2.flip(frame, 1)
            t0 = time.time()
            res = hands.process(cv2.cvtColor(frame, cv2.COLOR_BGR2RGB))
            infer_ms = (time.time() - t0) * 1000

            target = None
            if res.multi_hand_landmarks:
                lm = res.multi_hand_landmarks[0]
                # Wrist height, inverted so raising the hand raises the value.
                wrist_y = lm.landmark[mp.solutions.hands.HandLandmark.WRIST].y
                target = max(0.0, min(1.0, 1.0 - wrist_y))
                last_seen = time.time()
                if show:
                    draw.draw_landmarks(frame, lm,
                                        mp.solutions.hands.HAND_CONNECTIONS)

            if target is not None:
                value += (target - value) * ema
            elif time.time() - last_seen > 0.6:
                # Hand gone: fall back to silence rather than freezing at
                # whatever it was, which would leave a synth screaming.
                value += (0.0 - value) * 0.08

            frames += 1
            if time.time() - fps_t >= 0.5:
                fps = frames / (time.time() - fps_t)
                frames = 0
                fps_t = time.time()

            cc = int(round(value * 127))
            if show:
                h, w = frame.shape[:2]
                bar_h = int(value * (h - 40))
                cv2.rectangle(frame, (w - 60, h - 20 - bar_h),
                              (w - 25, h - 20), (9, 228, 244), -1)
                cv2.putText(frame, f"{cc:>3}", (w - 150, 60),
                            cv2.FONT_HERSHEY_SIMPLEX, 1.6, (9, 228, 244), 3)
                cv2.putText(frame,
                            f"{fps:4.1f} fps   infer {infer_ms:4.0f} ms"
                            f"   {'HAND' if target is not None else 'none'}",
                            (12, h - 14), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                            (255, 255, 255), 1)
                cv2.imshow("motion tracker - stage 1 (no MIDI)", frame)
                if cv2.waitKey(1) & 0xFF in (ord("q"), 27):
                    break
    finally:
        cap.release()
        hands.close()
        if show:
            cv2.destroyAllWindows()
        print("stopped.")


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--list", action="store_true", help="probe camera indices")
    ap.add_argument("--index", type=int, default=0)
    ap.add_argument("--flip", action="store_true",
                    help="mirror the preview (natural for a front camera)")
    a = ap.parse_args()
    if a.list:
        probe()
    else:
        run(a.index, a.flip)
