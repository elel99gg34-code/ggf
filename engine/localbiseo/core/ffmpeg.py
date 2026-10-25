from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from .errors import FeatureUnavailable


def find_ffmpeg() -> str | None:
    env = os.environ.get("LOCALBISEO_FFMPEG")
    if env and Path(env).exists():
        return env
    # 배포판에서는 엔진 실행 파일 옆에 ffmpeg를 같이 넣는다.
    exe_dir = Path(sys.executable).parent
    for name in ("ffmpeg.exe", "ffmpeg"):
        if (exe_dir / name).exists():
            return str(exe_dir / name)
    found = shutil.which("ffmpeg")
    if found:
        return found
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:  # noqa: BLE001
        return None


def require_ffmpeg() -> str:
    exe = find_ffmpeg()
    if not exe:
        raise FeatureUnavailable(
            "영상 처리를 하려면 ffmpeg가 필요해요. 설정 > 구성요소를 확인해 주세요.",
            component="ffmpeg",
            install_hint="pip install 'localbiseo-engine[ffmpeg]'",
        )
    return exe


def run(args: list[str], **kwargs) -> subprocess.CompletedProcess:
    exe = require_ffmpeg()
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    return subprocess.run([exe, "-hide_banner", *args], capture_output=True, text=True, encoding="utf-8", errors="replace", creationflags=flags, **kwargs)


def popen(args: list[str]) -> subprocess.Popen:
    exe = require_ffmpeg()
    flags = 0
    if sys.platform == "win32":
        flags = subprocess.CREATE_NO_WINDOW  # type: ignore[attr-defined]
    return subprocess.Popen(
        [exe, "-hide_banner", *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        creationflags=flags,
    )
