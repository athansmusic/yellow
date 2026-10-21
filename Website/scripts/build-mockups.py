#!/usr/bin/env python3
"""
Generate a full set of mockup angles (front, back, left, right, ...) for every
colour of every multi-colour Printful store product, and save them as
public/products/gallery/<product-slug>/<color-slug>/NN.webp.

Printful's store API only returns one `preview` mockup per variant, so this
uses the Mockup Generator API to render the rest, one task per colour (all
sizes of a colour share the same print position, so we render one size per
colour).

Usage:
    KEY=$(grep '^PRINTFUL_API_KEY=' .env.local | cut -d= -f2- | tr -d '"\r')
    python3 scripts/build-mockups.py "$KEY"

Reruns are cheap: any colour whose output folder already has files is skipped.
"""
from __future__ import annotations

import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

from PIL import Image

BASE = "https://api.printful.com"
ROOT = Path(__file__).resolve().parent.parent
GALLERY_ROOT = ROOT / "public" / "products" / "gallery"
LOG_PATH = Path(
    r"C:\Users\19407\AppData\Local\Temp\claude\C--Users-19407-Documents-Redacted-Script-Website\93122921-48d5-4ec8-b903-316777dadbb5\scratchpad\mockups.log"
)

# Hidden products (owner keeps these out of the store) — skip entirely.
HIDDEN_IDS = {427180291, 399675845, 401026272, 401004134, 393534325}

SIZE_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "3XL", "4XL", "5XL"]

BG = (243, 243, 243)
MAX_DIM = 1400

# Angle titles we care about, in save order. Anything else Printful returns
# (product details close-ups, label/embroidery close-ups) is skipped.
ANGLE_ORDER = ["front", "back", "left", "right"]
SKIP_TITLES = {"product details", "inside label", "outside label"}


def log(msg: str) -> None:
    line = f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] {msg}"
    print(line, flush=True)
    LOG_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


def slugify(s: str) -> str:
    s = s.lower()
    s = s.replace("&", " and ")
    s = re.sub(r"['\u2019\"\u201c\u201d*]", "", s)
    s = re.sub(r"[^a-z0-9]+", "-", s)
    return s.strip("-")


def color_slug(c: str) -> str:
    c = c.lower().strip()
    c = re.sub(r"[\s/]+", "-", c)
    c = re.sub(r"[^a-z0-9-]+", "", c)
    return re.sub(r"-+", "-", c).strip("-")


class PF:
    def __init__(self, key: str):
        self.key = key

    def _request(self, path: str, method="GET", body=None):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(
            f"{BASE}{path}",
            data=data,
            method=method,
            headers={"Authorization": f"Bearer {self.key}", "Content-Type": "application/json"},
        )
        for attempt in range(8):
            try:
                with urllib.request.urlopen(req, timeout=60) as r:
                    return json.load(r)
            except urllib.error.HTTPError as e:
                body_txt = e.read().decode(errors="replace")
                try:
                    msg = json.loads(body_txt).get("error", {}).get("message", body_txt)
                except Exception:
                    msg = body_txt
                wait_m = re.search(r"after (\d+) seconds?", msg, re.I)
                if (e.code == 429 or wait_m) and attempt < 7:
                    wait = (int(wait_m.group(1)) if wait_m else 20) + 2
                    log(f"  rate limited on {path} ({msg.strip()!r}); sleeping {wait}s")
                    time.sleep(wait)
                    continue
                raise RuntimeError(f"Printful {method} {path}: {e.code} {msg}") from None
        raise RuntimeError(f"Printful {method} {path}: exhausted retries")

    def get(self, path: str):
        return self._request(path)["result"]

    def get_v2(self, path: str):
        return self._request(path)["data"]

    def get_v2_paged(self, path: str):
        """v2 list endpoints default to limit=20; page through with ?offset= until exhausted."""
        out = []
        offset = 0
        limit = 100
        sep = "&" if "?" in path else "?"
        while True:
            res = self._request(f"{path}{sep}limit={limit}&offset={offset}")
            page = res["data"]
            out.extend(page)
            total = (res.get("paging") or {}).get("total", len(out))
            offset += len(page)
            if not page or offset >= total:
                break
        return out

    def post(self, path: str, body):
        return self._request(path, method="POST", body=body)["result"]


def list_sync_products(pf: PF):
    out, offset, limit = [], 0, 100
    while True:
        page = pf.get(f"/store/products?status=synced&limit={limit}&offset={offset}")
        out.extend(page)
        if len(page) < limit:
            break
        offset += limit
    return [p for p in out if not p.get("is_ignored")]


def size_rank(size: str | None) -> int:
    if not size:
        return 999
    try:
        return SIZE_ORDER.index(size.upper())
    except ValueError:
        return 998


def resolve_placement(file_type: str, vp_placements: dict) -> str | None:
    """Map a v1 sync-variant file `type` to the placement key the mockup generator expects."""
    if file_type in vp_placements:
        return file_type
    if file_type == "default" and "front" in vp_placements:
        return "front"
    stripped = re.sub(r"_dtf$", "", file_type)
    if stripped != file_type and stripped in vp_placements:
        return stripped
    return None


def find_v2_position(v2_placements: list, file_type: str, resolved: str):
    for pl in v2_placements:
        if pl["placement"] in (file_type, resolved):
            layers = pl.get("layers") or []
            if layers:
                return layers[0]["position"]
    return None


def build_files_payload(v1_variant, v2_variant, printfiles_by_id, vp_placements, log_prefix):
    files_payload = []
    for f in v1_variant["files"]:
        if not f.get("visible") or f["type"] == "preview":
            continue
        resolved = resolve_placement(f["type"], vp_placements)
        if not resolved:
            log(f"{log_prefix}  skip file type {f['type']!r}: no matching placement")
            continue
        pos_in = find_v2_position(v2_variant["placements"], f["type"], resolved)
        if not pos_in:
            log(f"{log_prefix}  skip placement {resolved!r}: no v2 position data")
            continue
        pfid = vp_placements[resolved]
        pf_info = printfiles_by_id.get(pfid)
        if not pf_info:
            log(f"{log_prefix}  skip placement {resolved!r}: unknown printfile {pfid}")
            continue
        dpi = pf_info["dpi"]
        position = {
            "area_width": pf_info["width"],
            "area_height": pf_info["height"],
            "width": round(pos_in["width"] * dpi),
            "height": round(pos_in["height"] * dpi),
            "top": round(pos_in["top"] * dpi),
            "left": round(pos_in["left"] * dpi),
        }
        files_payload.append({"placement": resolved, "image_url": f["preview_url"], "position": position})
    return files_payload


def normalize_placement_title(placement: str) -> str:
    """front_large / front_dtf / default all mean the same 'front' angle for display purposes."""
    base = re.sub(r"_(dtf|large)$", "", placement)
    if base == "default":
        base = "front"
    return base.replace("_", " ").title()


def collect_angle_images(task_result: dict) -> dict:
    """Pool every image the task returned (top-level per-placement + extras), dedupe by url,
    keep the first title/group seen, prefer 'Ghost' style over 'Flat' over anything else."""
    pool: dict[str, dict] = {}  # url -> {title, option_group}
    for m in task_result.get("mockups", []):
        url = m.get("mockup_url")
        if url and url not in pool:
            pool[url] = {"title": normalize_placement_title(m.get("placement", "")), "option_group": ""}
        for e in m.get("extra", []):
            if e["url"] not in pool:
                pool[e["url"]] = {"title": e.get("title", ""), "option_group": e.get("option_group", "")}

    group_priority = {"ghost": 0, "flat": 1, "": 2}
    by_angle: dict[str, list[tuple[int, str]]] = {}
    for url, info in pool.items():
        title = (info["title"] or "").strip().lower()
        if title in SKIP_TITLES or not title:
            continue
        prio = group_priority.get((info["option_group"] or "").strip().lower(), 3)
        by_angle.setdefault(title, []).append((prio, url))

    chosen: dict[str, str] = {}
    for title, candidates in by_angle.items():
        candidates.sort(key=lambda x: x[0])
        chosen[title] = candidates[0][1]
    return chosen


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "mockup-builder/1.0"})
    with urllib.request.urlopen(req, timeout=60) as r:
        return r.read()


def save_composited(raw: bytes, dest: Path) -> None:
    im = Image.open(io.BytesIO(raw)).convert("RGBA")
    bg = Image.new("RGBA", im.size, BG + (255,))
    bg.alpha_composite(im)
    out = bg.convert("RGB")
    w, h = out.size
    if max(w, h) > MAX_DIM:
        scale = MAX_DIM / max(w, h)
        out = out.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    out.save(dest, "WEBP", quality=88, method=6)


def run_task_and_save(pf: PF, catalog_product_id: int, files_payload: list, cvid: int, out_dir: Path, log_prefix: str) -> int:
    res = pf.post(
        f"/mockup-generator/create-task/{catalog_product_id}",
        {"variant_ids": [cvid], "format": "png", "files": files_payload},
    )
    task_key = res["task_key"]
    log(f"{log_prefix}  task {task_key} created, polling...")
    result = None
    for _ in range(40):
        time.sleep(4)
        j = pf.get(f"/mockup-generator/task?task_key={task_key}")
        status = j.get("status")
        if status == "completed":
            result = j
            break
        if status == "failed":
            raise RuntimeError(f"task {task_key} failed: {j}")
    if result is None:
        raise RuntimeError(f"task {task_key} timed out")

    angles = collect_angle_images(result)
    if not angles:
        log(f"{log_prefix}  WARNING: no usable angle images returned")
        return 0

    saved = 0
    ordered_titles = sorted(angles.keys(), key=lambda t: (ANGLE_ORDER.index(t) if t in ANGLE_ORDER else 99, t))
    for i, title in enumerate(ordered_titles, start=1):
        url = angles[title]
        try:
            raw = download(url)
            dest = out_dir / f"{i:02d}.webp"
            save_composited(raw, dest)
            saved += 1
            log(f"{log_prefix}  saved {title} -> {dest.relative_to(ROOT)}")
        except Exception as e:
            log(f"{log_prefix}  FAILED downloading/saving {title}: {e}")
    return saved


def main():
    if len(sys.argv) < 2 or not sys.argv[1].strip():
        print("usage: build-mockups.py <PRINTFUL_API_KEY>", file=sys.stderr)
        sys.exit(1)
    key = sys.argv[1].strip()
    pf = PF(key)

    log("=== build-mockups run start ===")
    summaries = list_sync_products(pf)
    log(f"{len(summaries)} synced products")

    printfiles_cache: dict[int, dict] = {}

    totals: dict[str, dict[str, int]] = {}
    skipped_products = []

    for summary in summaries:
        pid = summary["id"]
        if pid in HIDDEN_IDS:
            continue
        detail = pf.get(f"/store/products/{pid}")
        variants = [v for v in detail["sync_variants"] if v.get("synced") and not v.get("is_ignored")]
        if not variants:
            continue
        colors = sorted({v.get("color") for v in variants if v.get("color")})
        if len(colors) <= 1:
            continue

        name = detail["sync_product"]["name"]
        slug = slugify(name)
        log_prefix = f"[{name}]"
        log(f"{log_prefix} {len(colors)} colours: {colors}")

        v2_variants = pf.get_v2_paged(f"/v2/sync-products/{pid}/sync-variants")
        v2_by_id = {v["id"]: v for v in v2_variants}

        catalog_product_id = variants[0]["product"]["product_id"]
        if catalog_product_id not in printfiles_cache:
            printfiles_cache[catalog_product_id] = pf.get(f"/mockup-generator/printfiles/{catalog_product_id}")
        pfiles = printfiles_cache[catalog_product_id]
        printfiles_by_id = {p["printfile_id"]: p for p in pfiles["printfiles"]}
        vp_by_variant = {x["variant_id"]: x["placements"] for x in pfiles["variant_printfiles"]}

        totals[slug] = {}

        for color in colors:
            out_dir = GALLERY_ROOT / slug / color_slug(color)
            if out_dir.exists() and any(out_dir.iterdir()):
                log(f"{log_prefix}  {color}: already has images, skipping")
                continue

            color_variants = [v for v in variants if v.get("color") == color]
            color_variants.sort(key=lambda v: size_rank(v.get("size")))
            v1v = color_variants[0]
            v2v = v2_by_id.get(v1v["id"])
            if not v2v:
                log(f"{log_prefix}  {color}: no v2 placement data, skipping")
                continue
            cvid = v1v["variant_id"]
            vp_placements = vp_by_variant.get(cvid)
            if not vp_placements:
                log(f"{log_prefix}  {color}: no printfile placement data for variant {cvid}, skipping")
                continue

            files_payload = build_files_payload(v1v, v2v, printfiles_by_id, vp_placements, log_prefix)
            if not files_payload:
                log(f"{log_prefix}  {color}: no print files resolved, skipping")
                continue

            log(f"{log_prefix}  {color}: variant {v1v['name']} ({cvid}), {len(files_payload)} placements")
            try:
                saved = run_task_and_save(pf, catalog_product_id, files_payload, cvid, out_dir, log_prefix)
                totals[slug][color] = saved
            except Exception as e:
                log(f"{log_prefix}  {color}: FAILED - {e}")
                skipped_products.append(f"{name} / {color}: {e}")

            # Stay well under the mockup-generator rate limit between colours.
            time.sleep(15)

    log("=== summary ===")
    for slug, colors in totals.items():
        for color, n in colors.items():
            log(f"{slug} / {color}: {n} angle(s)")
    if skipped_products:
        log("=== failures ===")
        for s in skipped_products:
            log(s)
    log("=== build-mockups run end ===")


if __name__ == "__main__":
    main()
