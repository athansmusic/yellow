"""Stream Deck scene icons, in the house style.

288x288 PNGs: near-black ground, #f4e409 glyphs, hard corners, a thin
inset frame, and a small mono label so the glance never lies.

    python make_icons.py     writes all six next to itself
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
S = 288
BG = (8, 8, 10, 255)
FG = (244, 228, 9, 255)
DIM = (154, 154, 162, 255)
EDGE = (56, 56, 62, 255)

try:
    LABEL_FONT = ImageFont.truetype("C:/Windows/Fonts/consolab.ttf", 27)
except OSError:
    LABEL_FONT = ImageFont.load_default()


def canvas():
    im = Image.new("RGBA", (S, S), BG)
    d = ImageDraw.Draw(im)
    d.rectangle([8, 8, S - 9, S - 9], outline=EDGE, width=2)
    return im, d


def label(d, text):
    # manual letterspacing - it is what makes it read as the house mono
    spaced = " ".join(text.upper())
    w = d.textlength(spaced, font=LABEL_FONT)
    d.text(((S - w) / 2, S - 54), spaced, font=LABEL_FONT, fill=DIM)


def person(d, cx, cy, scale=1.0):
    r = int(30 * scale)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=FG)
    sw, sh = int(52 * scale), int(56 * scale)
    top = cy + int(14 * scale)
    d.pieslice([cx - sw, top, cx + sw, top + 2 * sh], 180, 360, fill=FG)


def waveform(d, x0, x1, base, heights, bar_w=10, gap=8):
    x = x0
    for h in heights:
        if x + bar_w > x1:
            break
        d.rectangle([x, base - h, x + bar_w, base + h], fill=FG)
        x += bar_w + gap


WAVE = [14, 30, 20, 44, 26, 52, 18, 38, 46, 22, 34, 12]


def full_cam():
    im, d = canvas()
    person(d, S // 2, 108, 1.25)
    label(d, "full cam")
    return im


def split_cam():
    im, d = canvas()
    person(d, 88, 112, 0.9)
    person(d, 200, 112, 0.9)
    # the seam, leaning like the real one (exaggerated so it reads small)
    d.line([(154, 40), (134, 208)], fill=FG, width=5)
    label(d, "split")
    return im


def in_game():
    im, d = canvas()
    d.rounded_rectangle([64, 96, 224, 176], radius=0, fill=FG)
    # dpad + buttons carved out of the slab in bg colour
    d.rectangle([96, 126, 128, 146], fill=BG)
    d.rectangle([102, 116, 122, 156], fill=BG)
    d.ellipse([168, 118, 188, 138], fill=BG)
    d.ellipse([190, 136, 210, 156], fill=BG)
    label(d, "in game")
    return im


def live_listen_duo():
    im, d = canvas()
    # heads only, clear air, then the waveform - no melting shapes
    for cx in (108, 180):
        d.ellipse([cx - 22, 58, cx + 22, 102], fill=FG)
    waveform(d, 56, 232, 176, [10, 22, 14, 32, 18, 38, 12, 28, 34, 16, 24, 8])
    label(d, "listen x2")
    return im


def live_listen_solo():
    im, d = canvas()
    d.ellipse([S // 2 - 25, 54, S // 2 + 25, 104], fill=FG)
    waveform(d, 56, 232, 176, [10, 22, 14, 32, 18, 38, 12, 28, 34, 16, 24, 8])
    label(d, "listen")
    return im


def ending():
    im, d = canvas()
    # the censor bar, with rough ends
    d.rectangle([60, 118, 228, 162], fill=FG)
    for x0, y0, x1, y1 in [(52, 126, 62, 138), (50, 144, 60, 156),
                           (226, 122, 236, 132), (228, 148, 238, 160)]:
        d.rectangle([x0, y0, x1, y1], fill=FG)
    label(d, "end")
    return im


def lamp(colour, text, on=True):
    def make():
        im, d = canvas()
        cx, cy, r = S // 2, 110, 46
        if on:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=colour)
            # glow ticks radiating, like light coming off it
            for dx, dy in [(-1, 0), (1, 0), (0, -1),
                           (-1, -1), (1, -1), (-1, 1), (1, 1)]:
                x0 = cx + dx * (r + 14)
                y0 = cy + dy * (r + 14)
                x1 = cx + dx * (r + 30)
                y1 = cy + dy * (r + 30)
                d.line([(x0, y0), (x1, y1)], fill=colour, width=6)
        else:
            d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=EDGE, width=6)
        # the stand
        d.rectangle([cx - 5, cy + r + 4, cx + 5, cy + r + 44],
                    fill=colour if on else EDGE)
        label(d, text)
        return im
    return make


PINK = (255, 45, 138, 255)
RED = (255, 34, 34, 255)

ICONS = {
    "deck-full-cam.png": full_cam,
    "deck-split-cam.png": split_cam,
    "deck-in-game.png": in_game,
    "deck-listen-duo.png": live_listen_duo,
    "deck-listen-solo.png": live_listen_solo,
    "deck-end.png": ending,
    "deck-light-pink.png": lamp(PINK, "pink"),
    "deck-light-red.png": lamp(RED, "red"),
    "deck-light-off.png": lamp(EDGE, "dark", on=False),
}

for name, fn in ICONS.items():
    fn().save(HERE / name)
    print("wrote", name)

# contact sheet for a quick human check
rows = (len(ICONS) + 2) // 3
sheet = Image.new("RGBA", (S * 3, S * rows), (24, 24, 27, 255))
for i, name in enumerate(ICONS):
    sheet.paste(Image.open(HERE / name), ((i % 3) * S, (i // 3) * S))
sheet.convert("RGB").save(HERE / "_contact_sheet.png")
print("wrote _contact_sheet.png")
