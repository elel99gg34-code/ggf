"""PDF 합치기, 나누기, 회전, 압축, 이미지↔PDF."""
from __future__ import annotations

import io
import re
from pathlib import Path

from fastapi import APIRouter
from PIL import Image, ImageOps
from pydantic import BaseModel, Field

from ..core.config import output_path
from ..core.errors import AppError

router = APIRouter(prefix="/pdf", tags=["PDF 도구"])


def _reader(path: str):
    from pypdf import PdfReader
    from pypdf.errors import PdfReadError

    p = Path(path)
    if not p.exists():
        raise AppError(f"파일을 찾을 수 없어요: {path}")
    try:
        reader = PdfReader(str(p))
    except PdfReadError as e:
        raise AppError(f"PDF를 읽을 수 없어요: {p.name}") from e
    if reader.is_encrypted:
        try:
            if not reader.decrypt(""):
                raise AppError(f"암호가 걸린 PDF예요: {p.name}")
        except Exception as e:  # noqa: BLE001
            raise AppError(f"암호가 걸린 PDF예요: {p.name}") from e
    return reader


def parse_ranges(spec: str, total: int) -> list[list[int]]:
    """'1-3, 5, 7-' → [[0,1,2],[4],[6..끝]] (0부터 시작하는 페이지 번호 묶음)"""
    groups = []
    for part in re.split(r"[,\s]+", spec.strip()):
        if not part:
            continue
        m = re.fullmatch(r"(\d*)-(\d*)|(\d+)", part)
        if not m:
            raise AppError(f"페이지 범위를 이해하지 못했어요: {part}")
        if m.group(3):
            a = b = int(m.group(3))
        else:
            a = int(m.group(1) or 1)
            b = int(m.group(2) or total)
        if not (1 <= a <= b <= total):
            raise AppError(f"페이지 범위가 문서({total}쪽)를 벗어나요: {part}")
        groups.append(list(range(a - 1, b)))
    if not groups:
        raise AppError("페이지 범위를 넣어 주세요.")
    return groups


def merge(paths: list[str], out: str | None) -> dict:
    from pypdf import PdfWriter

    writer = PdfWriter()
    pages = 0
    for p in paths:
        reader = _reader(p)
        for page in reader.pages:
            writer.add_page(page)
            pages += 1
    dst = Path(out) if out else output_path(Path(paths[0]), "_합본")
    with dst.open("wb") as f:
        writer.write(f)
    return {"dst": str(dst), "pages": pages}


def split(path: str, ranges: str | None, every: int | None, out_dir: str | None) -> dict:
    from pypdf import PdfWriter

    reader = _reader(path)
    total = len(reader.pages)
    if every:
        groups = [list(range(i, min(i + every, total))) for i in range(0, total, every)]
    else:
        groups = parse_ranges(ranges or "", total)
    src = Path(path)
    outputs = []
    for g in groups:
        writer = PdfWriter()
        for i in g:
            writer.add_page(reader.pages[i])
        label = f"_{g[0] + 1}" if len(g) == 1 else f"_{g[0] + 1}-{g[-1] + 1}"
        dst = output_path(src, label, out_dir=out_dir)
        with dst.open("wb") as f:
            writer.write(f)
        outputs.append(str(dst))
    return {"outputs": outputs}


def rotate(path: str, degrees: int, pages: str | None) -> dict:
    from pypdf import PdfWriter

    if degrees % 90:
        raise AppError("회전은 90도 단위만 돼요.")
    reader = _reader(path)
    targets = {i for g in parse_ranges(pages, len(reader.pages)) for i in g} if pages else set(range(len(reader.pages)))
    writer = PdfWriter()
    for i, page in enumerate(reader.pages):
        if i in targets:
            page.rotate(degrees)
        writer.add_page(page)
    dst = output_path(Path(path), "_회전")
    with dst.open("wb") as f:
        writer.write(f)
    return {"dst": str(dst), "rotated": len(targets)}


def compress(path: str, quality: int = 60, max_px: int = 1600) -> dict:
    from pypdf import PdfWriter

    src = Path(path)
    reader = _reader(path)
    writer = PdfWriter(clone_from=reader)
    images = 0
    for page in writer.pages:
        for img in page.images:
            try:
                pil = img.image
                if pil is None:
                    continue
                if max(pil.size) > max_px:
                    pil = ImageOps.contain(pil, (max_px, max_px))
                if pil.mode not in ("RGB", "L"):
                    pil = pil.convert("RGB")
                img.replace(pil, quality=quality)
                images += 1
            except Exception:  # noqa: BLE001 - 바꿀 수 없는 이미지 형식은 그대로 둔다
                continue
        page.compress_content_streams()
    writer.compress_identical_objects(remove_identicals=True, remove_orphans=True)
    dst = output_path(src, "_압축")
    with dst.open("wb") as f:
        writer.write(f)
    before, after = src.stat().st_size, dst.stat().st_size
    return {"dst": str(dst), "before": before, "after": after, "images": images, "saved_ratio": round(1 - after / before, 3) if before else 0}


def images_to_pdf(paths: list[str], out: str | None, page: str = "fit") -> dict:
    if not paths:
        raise AppError("이미지를 골라 주세요.")
    pages = []
    for p in paths:
        im = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
        if page == "a4":
            canvas = Image.new("RGB", (1240, 1754), "white")  # A4 150dpi
            fitted = ImageOps.contain(im, (1160, 1674))
            canvas.paste(fitted, ((1240 - fitted.width) // 2, (1754 - fitted.height) // 2))
            im = canvas
        pages.append(im)
    dst = Path(out) if out else output_path(Path(paths[0]), "_모음", ext="pdf")
    pages[0].save(dst, "PDF", save_all=True, append_images=pages[1:], resolution=150)
    return {"dst": str(dst), "pages": len(pages)}


def pdf_to_images(path: str, dpi: int = 150, fmt: str = "png", out_dir: str | None = None) -> dict:
    import pypdfium2 as pdfium

    src = Path(path)
    doc = pdfium.PdfDocument(str(src))
    outputs = []
    try:
        for i in range(len(doc)):
            img = doc[i].render(scale=dpi / 72).to_pil()
            dst = output_path(src, f"_{i + 1:03d}", ext=fmt, out_dir=out_dir)
            img.convert("RGB").save(dst, quality=90) if fmt == "jpg" else img.save(dst)
            outputs.append(str(dst))
    finally:
        doc.close()
    return {"outputs": outputs}


def info(path: str) -> dict:
    reader = _reader(path)
    meta = reader.metadata or {}
    return {
        "pages": len(reader.pages),
        "size": Path(path).stat().st_size,
        "title": str(meta.get("/Title", "") or ""),
        "author": str(meta.get("/Author", "") or ""),
    }


class MergeIn(BaseModel):
    paths: list[str] = Field(min_length=2)
    out_path: str | None = None


class SplitIn(BaseModel):
    path: str
    ranges: str | None = None
    every: int | None = None
    out_dir: str | None = None


class RotateIn(BaseModel):
    path: str
    degrees: int = 90
    pages: str | None = None


class CompressIn(BaseModel):
    path: str
    quality: int = 60
    max_px: int = 1600


class ImagesIn(BaseModel):
    paths: list[str] = Field(min_length=1)
    out_path: str | None = None
    page: str = "fit"


class ToImagesIn(BaseModel):
    path: str
    dpi: int = 150
    format: str = "png"
    out_dir: str | None = None


class PathIn(BaseModel):
    path: str


@router.post("/merge")
def merge_api(body: MergeIn):
    return merge(body.paths, body.out_path)


@router.post("/split")
def split_api(body: SplitIn):
    if not body.ranges and not body.every:
        raise AppError("나눌 범위나 쪽수를 넣어 주세요.")
    return split(body.path, body.ranges, body.every, body.out_dir)


@router.post("/rotate")
def rotate_api(body: RotateIn):
    return rotate(body.path, body.degrees, body.pages)


@router.post("/compress")
def compress_api(body: CompressIn):
    return compress(body.path, body.quality, body.max_px)


@router.post("/from-images")
def from_images_api(body: ImagesIn):
    return images_to_pdf(body.paths, body.out_path, body.page)


@router.post("/to-images")
def to_images_api(body: ToImagesIn):
    if body.format not in ("png", "jpg"):
        raise AppError("형식은 png 또는 jpg예요.")
    return pdf_to_images(body.path, body.dpi, body.format, body.out_dir)


@router.post("/info")
def info_api(body: PathIn):
    return info(body.path)
