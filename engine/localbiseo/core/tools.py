"""외부 실행 파일(ffmpeg, tesseract) 찾기.

배포판은 앱이 LOCALBISEO_RESOURCES(설치 폴더의 리소스 경로)를 넘겨준다.
macOS 앱은 셸 PATH를 물려받지 못해서 Homebrew 경로도 직접 살펴본다.
"""
from __future__ import annotations

import os
import shutil
import sys
from functools import lru_cache
from pathlib import Path

EXTRA_DIRS = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", r"C:\Program Files\Tesseract-OCR"]


@lru_cache(maxsize=None)
def find_tool(name: str) -> str | None:
    exe = f"{name}.exe" if sys.platform == "win32" else name
    env = os.environ.get(f"LOCALBISEO_{name.upper()}")
    if env and Path(env).exists():
        return env
    roots = []
    res = os.environ.get("LOCALBISEO_RESOURCES")
    if res:
        roots += [Path(res) / name, Path(res)]
    roots.append(Path(sys.executable).parent)
    for root in roots:
        if (root / exe).exists():
            return str(root / exe)
    found = shutil.which(name)
    if found:
        return found
    for d in EXTRA_DIRS:
        if (Path(d) / exe).exists():
            return str(Path(d) / exe)
    return None
