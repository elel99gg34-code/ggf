"""이미지 일괄 처리(규격, 워터마크, 배경 제거)와 영상 무음 컷·자막."""
from __future__ import annotations

import re
from pathlib import Path

from fastapi import APIRouter
from PIL import Image, ImageColor, ImageDraw, ImageOps
from pydantic import BaseModel, Field

from ..core import ffmpeg, fonts, license, optional
from ..core.config import output_path
from ..core.context import Ctx, job_ref
from ..core.errors import AppError
from ..core.jobs import JobContext
from .transcribe import export, stt

router = APIRouter(prefix="/media", tags=["이미지·영상"])

PRESETS = {
    "smartstore_main": {"label": "스마트스토어 대표 (1000×1000)", "width": 1000, "height": 1000, "mode": "pad"},
    "coupang_main": {"label": "쿠팡 대표 (1000×1000)", "width": 1000, "height": 1000, "mode": "pad"},
    "detail_860": {"label": "상세페이지 (가로 860)", "width": 860, "height": None, "mode": "width"},
    "insta_square": {"label": "인스타 정사각 (1080×1080)", "width": 1080, "height": 1080, "mode": "crop"},
    "insta_portrait": {"label": "인스타 세로 (1080×1350)", "width": 1080, "height": 1350, "mode": "crop"},
    "thumb_500": {"label": "썸네일 (500×500)", "width": 500, "height": 500, "mode": "crop"},
}
IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".gif", ".tif", ".tiff"}


class Watermark(BaseModel):
    text: str = ""
    position: str = "bottom-right"  # center | bottom-right | bottom-left | top-left | top-right | tile
    opacity: float = 0.35
    size: float = 0.05  # 이미지 너비 대비 글자 크기
    color: str = "#ffffff"


class ImageOpts(BaseModel):
    paths: list[str] = Field(min_length=1)
    preset: str | None = None
    width: int | None = None
    height: int | None = None
    mode: str = "fit"  # fit | pad | crop | width | none
    background: str = "#ffffff"
    remove_bg: bool = False
    watermark: Watermark | None = None
    format: str = "jpg"  # jpg | png | webp | same
    quality: int = 90
    suffix: str = "_편집"
    out_dir: str | None = None


def _resize(img: Image.Image, w: int | None, h: int | None, mode: str, bg: str) -> Image.Image:
    if mode == "none" or (not w and not h):
        return img
    if mode == "width" or not h:
        ratio = w / img.width
        return img.resize((w, max(1, round(img.height * ratio))), Image.Resampling.LANCZOS)
    if not w:
        ratio = h / img.height
        return img.resize((max(1, round(img.width * ratio)), h), Image.Resampling.LANCZOS)
    if mode == "crop":
        return ImageOps.fit(img, (w, h), Image.Resampling.LANCZOS)
    fitted = ImageOps.contain(img, (w, h), Image.Resampling.LANCZOS)
    if mode == "fit":
        return fitted
    canvas = Image.new("RGBA", (w, h), ImageColor.getrgb(bg) + (255,))
    canvas.alpha_composite(fitted.convert("RGBA"), ((w - fitted.width) // 2, (h - fitted.height) // 2))
    return canvas


def _watermark(img: Image.Image, wm: Watermark) -> Image.Image:
    if not wm.text.strip():
        return img
    base = img.convert("RGBA")
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    size = max(12, int(base.width * wm.size))
    font = fonts.load(size)
    rgb = ImageColor.getrgb(wm.color)[:3]
    fill = rgb + (int(255 * max(0.0, min(1.0, wm.opacity))),)
    shadow = (0, 0, 0, int(fill[3] * 0.5))
    l, t, r, b = draw.textbbox((0, 0), wm.text, font=font)
    tw, th = r - l, b - t
    margin = int(base.width * 0.03)
    if wm.position == "tile":
        step_x, step_y = tw + size * 3, th + size * 3
        for y in range(-th, base.height + th, step_y):
            offset = (y // step_y % 2) * step_x // 2
            for x in range(-tw + offset, base.width + tw, step_x):
                draw.text((x, y), wm.text, font=font, fill=fill)
    else:
        positions = {
            "center": ((base.width - tw) // 2, (base.height - th) // 2),
            "bottom-right": (base.width - tw - margin, base.height - th - margin),
            "bottom-left": (margin, base.height - th - margin),
            "top-left": (margin, margin),
            "top-right": (base.width - tw - margin, margin),
        }
        x, y = positions.get(wm.position, positions["bottom-right"])
        x, y = x - l, y - t
        draw.text((x + 2, y + 2), wm.text, font=font, fill=shadow)
        draw.text((x, y), wm.text, font=font, fill=fill)
    return Image.alpha_composite(base, layer)


def _remove_bg(img: Image.Image) -> Image.Image:
    optional.require("rembg")
    from rembg import remove

    return remove(img.convert("RGBA"))


def process_image(src: Path, o: ImageOpts) -> Path:
    img = Image.open(src)
    img = ImageOps.exif_transpose(img)
    img = img.convert("RGBA") if img.mode not in ("RGB", "RGBA") else img
    if o.remove_bg:
        img = _remove_bg(img)
    w, h, mode = o.width, o.height, o.mode
    if o.preset:
        p = PRESETS[o.preset]
        w, h, mode = p["width"], p["height"], p["mode"]
    img = _resize(img, w, h, mode, o.background)
    if o.watermark:
        img = _watermark(img, o.watermark)
    fmt = src.suffix.lower().lstrip(".") if o.format == "same" else o.format
    fmt = {"jpeg": "jpg", "tif": "png", "tiff": "png", "bmp": "png", "gif": "png"}.get(fmt, fmt)
    if fmt == "jpg" and img.mode == "RGBA":
        bg = Image.new("RGB", img.size, ImageColor.getrgb(o.background))
        bg.paste(img, mask=img.split()[3])
        img = bg
    dst = output_path(src, o.suffix, ext=fmt, out_dir=o.out_dir)
    save_kw = {"quality": o.quality} if fmt in ("jpg", "webp") else {"optimize": True}
    img.save(dst, {"jpg": "JPEG", "png": "PNG", "webp": "WEBP"}[fmt], **save_kw)
    return dst


def run_images(job: JobContext, o: ImageOpts) -> dict:
    files: list[Path] = []
    for p in o.paths:
        path = Path(p)
        if path.is_dir():
            files += sorted(f for f in path.iterdir() if f.suffix.lower() in IMAGE_EXTS)
        elif path.exists():
            files.append(path)
    if not files:
        raise AppError("처리할 이미지가 없어요.")
    results = []
    for i, f in enumerate(files):
        job.progress(i / len(files), f"{i + 1}/{len(files)} {f.name}")
        try:
            results.append({"src": str(f), "dst": str(process_image(f, o))})
        except AppError:
            raise
        except Exception as e:  # noqa: BLE001 - 파일 하나 실패해도 계속
            results.append({"src": str(f), "error": f"처리 실패: {e}"})
    return {"results": results}


# --- 영상 ---
SILENCE_START = re.compile(r"silence_start:\s*(-?[\d.]+)")
SILENCE_END = re.compile(r"silence_end:\s*([\d.]+)")
DURATION_RE = re.compile(r"Duration:\s*(\d+):(\d+):([\d.]+)")


def probe(path: str) -> dict:
    res = ffmpeg.run(["-i", path])
    m = DURATION_RE.search(res.stderr)
    duration = int(m.group(1)) * 3600 + int(m.group(2)) * 60 + float(m.group(3)) if m else 0.0
    return {"duration": duration, "has_video": bool(re.search(r"Stream #.*Video:", res.stderr)), "has_audio": bool(re.search(r"Stream #.*Audio:", res.stderr))}


def detect_silence(path: str, noise_db: float = -35, min_silence: float = 0.6) -> dict:
    if not Path(path).exists():
        raise AppError(f"파일을 찾을 수 없어요: {path}")
    info = probe(path)
    if not info["has_audio"]:
        raise AppError("소리가 없는 파일이에요.")
    res = ffmpeg.run(["-nostats", "-i", path, "-af", f"silencedetect=noise={noise_db}dB:d={min_silence}", "-vn", "-f", "null", "-"])
    silences = []
    start = None
    for line in res.stderr.splitlines():
        if (m := SILENCE_START.search(line)):
            start = max(0.0, float(m.group(1)))
        elif (m := SILENCE_END.search(line)) and start is not None:
            silences.append((start, float(m.group(1))))
            start = None
    if start is not None:
        silences.append((start, info["duration"]))
    return {"duration": info["duration"], "silences": silences, "has_video": info["has_video"]}


def keep_ranges(silences: list[tuple[float, float]], duration: float, pad: float = 0.15, min_keep: float = 0.25) -> list[tuple[float, float]]:
    ranges = []
    cur = 0.0
    for s, e in silences:
        if s - cur > 0:
            ranges.append((cur, min(duration, s + pad)))
        cur = max(cur, e - pad)
    if duration - cur > 0:
        ranges.append((cur, duration))
    merged: list[tuple[float, float]] = []
    for s, e in ranges:
        if e - s < min_keep:
            continue
        if merged and s <= merged[-1][1]:
            merged[-1] = (merged[-1][0], max(merged[-1][1], e))
        else:
            merged.append((s, e))
    return merged


def cut_silence(job: JobContext, path: str, noise_db: float, min_silence: float, pad: float, out_dir: str | None) -> dict:
    job.progress(0.02, "무음 구간 찾는 중")
    info = detect_silence(path, noise_db, min_silence)
    ranges = keep_ranges(info["silences"], info["duration"], pad)
    if not ranges:
        raise AppError("남길 구간이 없어요. 무음 기준(dB)을 낮춰 보세요.")
    kept = sum(e - s for s, e in ranges)
    expr = "+".join(f"between(t,{s:.3f},{e:.3f})" for s, e in ranges)
    src = Path(path)
    dst = output_path(src, "_무음컷", out_dir=out_dir)
    args = ["-y", "-i", path]
    if info["has_video"]:
        args += ["-vf", f"select='{expr}',setpts=N/FRAME_RATE/TB"]
    args += ["-af", f"aselect='{expr}',asetpts=N/SR/TB", "-progress", "pipe:1", "-nostats", str(dst)]
    proc = ffmpeg.popen(args)
    assert proc.stdout is not None
    for line in proc.stdout:
        if line.startswith("out_time_us=") or line.startswith("out_time_ms="):
            try:
                t = int(line.split("=")[1]) / 1_000_000
                job.progress(0.05 + 0.9 * min(1.0, t / max(kept, 0.1)), f"자르는 중 {int(t)}초 / {int(kept)}초")
            except ValueError:
                pass
        if job.cancelled:
            proc.kill()
            job.check()
    err = proc.stderr.read() if proc.stderr else ""
    if proc.wait() != 0:
        raise AppError(f"영상 자르기에 실패했어요: {err[-300:]}")
    return {"dst": str(dst), "original": info["duration"], "result": kept, "removed": info["duration"] - kept, "cuts": len(info["silences"])}


def make_subtitles(job: JobContext, path: str, model: str, fmt: str, out_dir: str | None) -> dict:
    res = stt.transcribe(job, path, model, "ko")
    src = Path(path)
    dst = output_path(src, "", ext=fmt, out_dir=out_dir)
    content = export.to_srt(res["segments"]) if fmt == "srt" else export.to_vtt(res["segments"])
    dst.write_text(content, encoding="utf-8")
    return {"dst": str(dst), "segments": len(res["segments"])}


class SilenceIn(BaseModel):
    path: str
    noise_db: float = -35
    min_silence: float = 0.6
    pad: float = 0.15
    out_dir: str | None = None


class SubtitleIn(BaseModel):
    path: str
    model: str = "small"
    format: str = "srt"
    out_dir: str | None = None


@router.get("/presets")
def presets():
    return {
        "presets": [{"key": k, **v} for k, v in PRESETS.items()],
        "rembg": optional.available("rembg"),
        "ffmpeg": ffmpeg.find_ffmpeg() is not None,
        "stt": optional.available("stt"),
        "font": fonts.korean_font_path() is not None,
    }


@router.post("/images")
def images(body: ImageOpts, ctx: Ctx):
    license.require_pro(ctx.db)
    if body.preset and body.preset not in PRESETS:
        raise AppError("알 수 없는 규격이에요.")
    if body.format not in ("jpg", "png", "webp", "same"):
        raise AppError("저장 형식은 jpg, png, webp, same 중 하나예요.")
    if body.remove_bg:
        optional.require("rembg")
    return job_ref(ctx.jobs.submit("images", f"이미지 {len(body.paths)}개 처리", run_images, body))


@router.post("/silence/detect")
def silence_detect(body: SilenceIn):
    info = detect_silence(body.path, body.noise_db, body.min_silence)
    ranges = keep_ranges(info["silences"], info["duration"], body.pad)
    kept = sum(e - s for s, e in ranges)
    return {**info, "keep": ranges, "result": kept, "removed": info["duration"] - kept}


@router.post("/silence/cut")
def silence_cut(body: SilenceIn, ctx: Ctx):
    license.require_pro(ctx.db)
    ffmpeg.require_ffmpeg()
    return job_ref(ctx.jobs.submit("cut", f"무음 컷: {Path(body.path).name}", cut_silence, body.path, body.noise_db, body.min_silence, body.pad, body.out_dir))


@router.post("/subtitles")
def subtitles(body: SubtitleIn, ctx: Ctx):
    license.require_pro(ctx.db)
    optional.require("stt")
    if body.format not in ("srt", "vtt"):
        raise AppError("자막 형식은 srt 또는 vtt예요.")
    return job_ref(ctx.jobs.submit("subtitles", f"자막 만들기: {Path(body.path).name}", make_subtitles, body.path, body.model, body.format, body.out_dir))
