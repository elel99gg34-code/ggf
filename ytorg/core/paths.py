"""앱이 쓰는 파일 경로를 한곳에서 결정한다.

설치본은 %LOCALAPPDATA%\\Programs\\YTOrganizer 아래에 있고 그 폴더는 쓰기가
막혀 있을 수 있으므로, 사용자 데이터(DB·설정·로그)는 항상 %APPDATA% 쪽에 둔다.
개발 중에는 YTORG_DATA_DIR 환경변수로 아무 곳이나 가리킬 수 있다.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

APP_NAME = "YTOrganizer"


def data_dir() -> Path:
    """DB·설정·로그가 들어가는 사용자별 폴더."""
    override = os.environ.get("YTORG_DATA_DIR")
    if override:
        path = Path(override)
    elif sys.platform == "win32":
        base = os.environ.get("APPDATA") or str(Path.home() / "AppData" / "Roaming")
        path = Path(base) / APP_NAME
    elif sys.platform == "darwin":
        path = Path.home() / "Library" / "Application Support" / APP_NAME
    else:
        base = os.environ.get("XDG_DATA_HOME") or str(Path.home() / ".local" / "share")
        path = Path(base) / APP_NAME.lower()
    path.mkdir(parents=True, exist_ok=True)
    return path


def db_path() -> Path:
    return data_dir() / "ytorg.db"


def log_path() -> Path:
    return data_dir() / "ytorg.log"


def settings_path() -> Path:
    return data_dir() / "settings.json"


def resource_dir() -> Path:
    """번들된 읽기 전용 리소스(아이콘, 기본 규칙, client_secret) 위치.

    PyInstaller onedir 빌드에서는 sys._MEIPASS 아래로 풀린다.
    """
    bundled = getattr(sys, "_MEIPASS", None)
    if bundled:
        return Path(bundled) / "resources"
    return Path(__file__).resolve().parent.parent / "resources"
