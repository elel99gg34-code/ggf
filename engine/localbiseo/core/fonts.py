"""한글 글꼴 찾기. Pillow 기본 글꼴에는 한글이 없다."""
from __future__ import annotations

import os
import sys
from functools import lru_cache
from pathlib import Path

from PIL import ImageFont

CANDIDATES = [
    # Windows
    r"C:\Windows\Fonts\malgun.ttf",
    r"C:\Windows\Fonts\malgunbd.ttf",
    r"C:\Windows\Fonts\gulim.ttc",
    # macOS
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
    "/System/Library/Fonts/Supplemental/AppleGothic.ttf",
    "/Library/Fonts/NanumGothic.ttf",
    # Linux
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    "/usr/share/fonts/truetype/nanum/NanumGothicBold.ttf",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
    "/usr/share/fonts/noto-cjk/NotoSansCJK-Regular.ttc",
]


@lru_cache(maxsize=1)
def korean_font_path() -> str | None:
    env = os.environ.get("LOCALBISEO_FONT")
    if env and Path(env).exists():
        return env
    bundled = Path(getattr(sys, "_MEIPASS", Path(__file__).parent)) / "fonts" / "NanumGothic.ttf"
    for path in [str(bundled), *CANDIDATES]:
        if Path(path).exists():
            return path
    return None


def load(size: int) -> ImageFont.ImageFont:
    path = korean_font_path()
    if path:
        return ImageFont.truetype(path, size)
    return ImageFont.load_default(size)
