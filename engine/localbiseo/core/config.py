from __future__ import annotations

import os
import sys
from pathlib import Path

APP_NAME = "LocalBiseo"


def data_dir() -> Path:
    env = os.environ.get("LOCALBISEO_HOME")
    if env:
        path = Path(env)
    elif sys.platform == "win32":
        path = Path(os.environ.get("APPDATA", str(Path.home()))) / APP_NAME
    elif sys.platform == "darwin":
        path = Path.home() / "Library" / "Application Support" / APP_NAME
    else:
        path = Path(os.environ.get("XDG_DATA_HOME", str(Path.home() / ".local" / "share"))) / "localbiseo"
    path.mkdir(parents=True, exist_ok=True)
    return path


def sub_dir(name: str, base: Path | None = None) -> Path:
    path = (base or data_dir()) / name
    path.mkdir(parents=True, exist_ok=True)
    return path


def output_path(src: Path, suffix: str, ext: str | None = None, out_dir: str | Path | None = None) -> Path:
    """원본 옆(또는 out_dir)에 '<이름><suffix>.<ext>' 경로를 만들고, 이미 있으면 번호를 붙인다."""
    folder = Path(out_dir) if out_dir else src.parent
    folder.mkdir(parents=True, exist_ok=True)
    ext = ext if ext is not None else src.suffix.lstrip(".")
    dot_ext = f".{ext}" if ext else ""
    candidate = folder / f"{src.stem}{suffix}{dot_ext}"
    n = 2
    while candidate.exists():
        candidate = folder / f"{src.stem}{suffix}({n}){dot_ext}"
        n += 1
    return candidate
