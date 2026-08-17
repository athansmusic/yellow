"""Ingest a subscriber's walk-on track.

    python add.py <audio-or-video-file> <twitch-username>

Takes whatever they sent (mp3, wav, a video, a voice memo), and produces
walkons/<username>.mp3 that is safe to fire on stream:

  - trimmed to MAX_SECONDS with a fade-out, so nobody's walk-on is a song
  - loudness-normalised to -16 LUFS, so one person's clip is never twice
    as loud as another's (or as the show)
  - mono 44.1k mp3, small and Firebot-friendly

Re-running for the same user replaces their track.

LISTEN TO THE CLIP FIRST. This tool makes it consistent, not appropriate -
copyright and content are the human's call.
"""
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
MAX_SECONDS = 8
FADE = 1.0


def main() -> int:
    if len(sys.argv) != 3:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    user = sys.argv[2].strip().lstrip("@").lower()
    if not src.is_file():
        print(f"no such file: {src}")
        return 1
    if not user.replace("_", "").isalnum():
        print(f"that does not look like a twitch username: {user!r}")
        return 1

    out = HERE / f"{user}.mp3"
    fade_start = MAX_SECONDS - FADE
    cmd = [
        "ffmpeg", "-y", "-v", "error",
        "-i", str(src),
        "-t", str(MAX_SECONDS),
        "-af", f"loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=out:st={fade_start}:d={FADE}",
        "-ac", "1", "-ar", "44100", "-b:a", "160k",
        str(out),
    ]
    if subprocess.run(cmd).returncode != 0:
        print("ffmpeg failed - is the source actually audio/video?")
        return 1

    size_kb = out.stat().st_size // 1024
    print(f"ok: {out.name}  ({size_kb} KB, max {MAX_SECONDS}s, -16 LUFS)")
    print("plays on their first chat of each stream via Firebot's "
          "Viewer Arrived event")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
