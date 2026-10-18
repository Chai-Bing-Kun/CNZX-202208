# -*- coding: utf-8 -*-
"""
批量把 img/ 下的原图压成站点可直接读取的 WebP 三档尺寸，
并生成 photos/albums.json 作为全站唯一数据源。

用法:
    py -3 -X utf8 tools/build_photos.py            # 全量
    py -3 -X utf8 tools/build_photos.py --limit 20 # 只跑前 20 张试水
    py -3 -X utf8 tools/build_photos.py --force    # 忽略已有产物重新编码

说明:
    * 全程只看文件路径与 EXIF，不做任何内容判断
    * 自动按 EXIF 方向摆正，并剥离全部元数据（含 GPS）
    * 三档：480 / 1280 / 1920（长边），原图小于该尺寸时自动降档
    * 输出到 photos/<album>/<name>-<width>.webp
"""

import json
import sys
import time
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps

Image.MAX_IMAGE_PIXELS = None

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "img"
OUT = ROOT / "photos"

TIERS = [(480, 66), (1280, 72), (1920, 74)]
PHOTO_EXT = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff"}
VIDEO_EXT = {".mp4", ".mov", ".m4v"}

# 目录名 -> (id, 标题)
ALBUMS = [
    ("第二次运动会及之前照片", "sports-day-2", "运动会与日常"),
    ("第二次研学", "study-tour-2", "第二次研学"),
    ("第二届艺术节", "art-festival-2", "第二届艺术节"),
    ("第三次研学", "study-tour-3", "第三次研学"),
    ("第四次研学", "study-tour-4", "第四次研学"),
    ("第五次研学", "study-tour-5", "第五次研学"),
]

SITE_ASSETS = {
    "1.JPG": "carousel-1",
    "2.JPG": "carousel-2",
    "3.JPG": "carousel-3",
    "4.JPG": "carousel-4",
    "5.JPG": "carousel-5",
    "6.JPG": "carousel-6",
    "7.JPG": "carousel-7",
    "background.jpg": "background",
    "background-2.jpg": "background-2",
    "happy-time.png": "happy-time",
    "初中应用照片.png": "app-shot",
}


def log(msg):
    print(msg, flush=True)


# 早于此年份的 EXIF 时间基本是「相机时钟没设」的默认值，不作数
MIN_YEAR = 2018


def plausible(dt):
    if dt is None:
        return False
    return MIN_YEAR <= dt.year <= datetime.now().year + 1


def exif_date(im, path):
    cand = None
    try:
        ex = im.getexif()
        raw = ex.get(36867) or ex.get(306)
        if raw:
            cand = datetime.strptime(
                str(raw)[:19].replace("-", ":"), "%Y:%m:%d %H:%M:%S"
            )
    except Exception:
        pass
    if plausible(cand):
        return cand
    try:
        mtime = datetime.fromtimestamp(path.stat().st_mtime)
        if plausible(mtime):
            return mtime
    except Exception:
        pass
    return None


CACHE_FILE = OUT / ".cache.json"
CACHE = {}


def load_cache():
    global CACHE
    try:
        CACHE = json.loads(CACHE_FILE.read_text("utf-8"))
        if not isinstance(CACHE, dict):
            CACHE = {}
    except Exception:
        CACHE = {}


def save_cache():
    try:
        CACHE_FILE.write_text(
            json.dumps(CACHE, ensure_ascii=False, separators=(",", ":")), "utf-8"
        )
    except Exception:
        pass


def build_one(path, dest_dir, stem, force=False):
    """返回 (widths, out_w, out_h, color, date)"""
    key = path.relative_to(ROOT).as_posix()
    try:
        st = path.stat()
        stamp = "%d:%d" % (int(st.st_mtime), st.st_size)
    except Exception:
        stamp = ""

    # 命中缓存：文件没变且产物齐全，就不再解码原图
    cached = CACHE.get(key)
    if cached and cached.get("s") == stamp and not force:
        targets = cached.get("t") or []
        if targets and all(
            (dest_dir / ("%s-%d.webp" % (stem, t))).exists() for t in targets
        ):
            raw_date = cached.get("d") or ""
            date = None
            if raw_date:
                try:
                    date = datetime.strptime(raw_date, "%Y-%m-%dT%H:%M:%S")
                except Exception:
                    date = None
                # 旧缓存里可能存着「相机时钟没设」的假日期，落回重算
                if not plausible(date):
                    date = "recheck"
            if date != "recheck":
                return targets, cached["w"], cached["h"], cached["c"], date

    try:
        with Image.open(path) as raw:
            date = exif_date(raw, path)

            # JPEG 用 DCT 缩放快速解码（1/2、1/4、1/8），大幅提速
            if path.suffix.lower() in (".jpg", ".jpeg"):
                try:
                    raw.draft("RGB", (1920, 1920))
                except Exception:
                    pass

            im = ImageOps.exif_transpose(raw)
            if im.mode != "RGB":
                im = im.convert("RGB")

            src_w, src_h = im.size

            # 主色（1x1 缩略）
            try:
                color = "#%02x%02x%02x" % im.resize((1, 1), Image.BOX).getpixel((0, 0))
            except Exception:
                color = "#8a8175"

            written = {}
            # 从大到小编码：已存在的大档不重复缩，缺失的档从当前最大结果继续缩
            cur = im
            for width, quality in sorted(TIERS, reverse=True):
                target = min(width, src_w)
                if target in written:
                    continue
                dest = dest_dir / ("%s-%d.webp" % (stem, target))
                need = force or not dest.exists()
                if need:
                    if cur.size[0] > target:
                        cur = cur.resize(
                            (target, max(1, round(cur.size[1] * target / cur.size[0]))),
                            Image.LANCZOS,
                        )
                    try:
                        cur.save(dest, "WEBP", quality=quality, method=3, exact=False)
                    except Exception as exc:
                        log("  ! encode fail %s %s" % (dest.name, exc))
                        continue
                written[target] = dest

            if not written:
                return None

        # 以最大的一档作为该照片的显示尺寸
        widths = sorted(written)
        biggest = widths[-1]
        if biggest >= src_w:
            out_w, out_h = src_w, src_h
        else:
            out_h = max(1, round(src_h * biggest / src_w))
            out_w = biggest

        CACHE[key] = {
            "s": stamp,
            "t": widths,
            "w": out_w,
            "h": out_h,
            "c": color,
            "d": date.strftime("%Y-%m-%dT%H:%M:%S") if date else "",
        }
        return widths, out_w, out_h, color, date
    except Exception as exc:
        log("  ! skip %s (%s)" % (path.name, exc))
        return None


def main():
    force = "--force" in sys.argv
    limit = None
    if "--limit" in sys.argv:
        limit = int(sys.argv[sys.argv.index("--limit") + 1])

    OUT.mkdir(exist_ok=True)
    load_cache()
    started = time.time()

    albums_out = []
    total_photos = 0
    total_bytes = 0

    for dir_name, album_id, title in ALBUMS:
        src_dir = SRC / dir_name
        if not src_dir.is_dir():
            log("[skip album] missing dir: %s" % dir_name)
            continue

        files = sorted(
            p for p in src_dir.iterdir()
            if p.is_file() and p.suffix.lower() in PHOTO_EXT
        )
        videos = sorted(p for p in src_dir.iterdir() if p.is_file() and p.suffix.lower() in VIDEO_EXT)

        dest_dir = OUT / album_id
        dest_dir.mkdir(parents=True, exist_ok=True)

        photos = []
        log("[album] %s  %d photos" % (album_id, len(files)))
        for idx, path in enumerate(files, 1):
            if limit is not None and total_photos >= limit:
                break
            stem = path.stem
            result = build_one(path, dest_dir, stem, force=force)
            if not result:
                continue
            widths, w, h, color, date = result
            photos.append({
                "n": stem,
                "w": w,
                "h": h,
                "c": color,
                "d": date.strftime("%Y-%m-%d") if date else "",
                "t": widths,
            })
            total_photos += 1
            if idx % 10 == 0 or idx == len(files):
                log("    %d/%d  %s" % (idx, len(files), path.name))

        if not photos:
            continue

        # 按拍摄时间排序（无日期的排后面），再按文件名
        photos.sort(key=lambda p: (p["d"] or "9999", p["n"]))

        dates = [p["d"] for p in photos if p["d"]]
        cover = photos[0]
        album_bytes = sum(
            f.stat().st_size for f in dest_dir.iterdir() if f.suffix == ".webp"
        )
        total_bytes += album_bytes
        save_cache()

        albums_out.append({
            "id": album_id,
            "title": title,
            "dir": dir_name,
            "count": len(photos),
            "videos": len(videos),
            "from": min(dates) if dates else "",
            "to": max(dates) if dates else "",
            "cover": cover["n"],
            "bytes": album_bytes,
            "photos": photos,
        })

    # 站点主视觉 / 轮播图
    site = {}
    site_dir = OUT / "_site"
    site_dir.mkdir(parents=True, exist_ok=True)
    for filename, slug in SITE_ASSETS.items():
        path = SRC / filename
        if not path.is_file():
            log("[skip site] missing %s" % filename)
            continue
        result = build_one(path, site_dir, slug, force=force)
        if result:
            widths, w, h, color, _ = result
            site[slug] = {"w": w, "h": h, "c": color, "t": widths}
            log("[site] %s -> %s" % (filename, slug))

    # 加载动画是动图，直接复制
    gif = SRC / "loading10.gif"
    if gif.is_file():
        import shutil
        shutil.copy2(gif, site_dir / "loading10.gif")

    save_cache()

    payload = {
        "generated": datetime.now().strftime("%Y-%m-%d %H:%M"),
        "tiers": [t[0] for t in TIERS],
        "total": total_photos,
        "albums": albums_out,
        "site": site,
    }
    manifest = OUT / "albums.json"
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    manifest.write_text(body, encoding="utf-8")

    # 同步输出一份 <script> 版，file:// 直接双击打开也能读到数据
    (OUT / "albums.js").write_text(
        "window.ALBUMS_DATA=" + body + ";\n", encoding="utf-8")

    elapsed = time.time() - started
    log("")
    log("done: %d photos, %.1f MB of webp, %d albums, %.1fs" % (
        total_photos, total_bytes / 1048576, len(albums_out), elapsed))
    log("manifest: %s (%.1f KB)" % (manifest, manifest.stat().st_size / 1024))


if __name__ == "__main__":
    main()
