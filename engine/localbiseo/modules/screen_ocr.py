"""화면/이미지 글자 인식. 앱 셸이 화면을 캡처해 파일 경로를 넘긴다."""
from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter
from PIL import Image, ImageOps
from pydantic import BaseModel

from ..core import ocr, optional
from ..core.errors import AppError

router = APIRouter(prefix="/ocr", tags=["화면 OCR"])


class OcrIn(BaseModel):
    path: str
    crop: list[int] | None = None  # [x, y, w, h] 원본 픽셀 기준
    upscale: bool = True


def read_image(path: str, crop: list[int] | None = None, upscale: bool = True) -> dict:
    if not Path(path).exists():
        raise AppError(f"파일을 찾을 수 없어요: {path}")
    img = Image.open(path)
    img = ImageOps.exif_transpose(img).convert("RGB")
    if crop:
        x, y, w, h = crop
        if w <= 2 or h <= 2:
            raise AppError("선택한 영역이 너무 작아요.")
        img = img.crop((x, y, x + w, y + h))
    # 화면 글자는 작아서 2배로 키우면 인식률이 확 오른다.
    if upscale and img.width < 1600:
        img = img.resize((img.width * 2, img.height * 2), Image.Resampling.LANCZOS)
    lines = ocr.ocr_image(img)
    text = "\n".join(l.text for l in lines)
    return {"text": text, "lines": [l.to_dict() for l in lines], "backend": ocr.backend_name()}


@router.get("/status")
def status():
    return {"available": optional.available("ocr"), "backend": ocr.backend_name()}


@router.post("/image")
def image(body: OcrIn):
    return read_image(body.path, body.crop, body.upscale)
