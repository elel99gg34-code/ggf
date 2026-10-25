from __future__ import annotations

import os
import shutil
from pathlib import Path

import pytest

FONT_CANDIDATES = [
    "/usr/share/fonts/truetype/nanum/NanumGothic.ttf",
    r"C:\Windows\Fonts\malgun.ttf",
    "/System/Library/Fonts/AppleSDGothicNeo.ttc",
]


@pytest.fixture(autouse=True)
def isolated_home(tmp_path, monkeypatch):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("LOCALBISEO_HOME", str(home))
    return home


@pytest.fixture
def app(isolated_home):
    from localbiseo.app import create_app

    return create_app(data_dir=isolated_home)


@pytest.fixture
def client(app):
    from fastapi.testclient import TestClient

    with TestClient(app) as c:
        yield c


@pytest.fixture
def wait_job(app):
    def _wait(resp_json: dict, timeout: float = 60) -> dict:
        job = app.state.ctx.jobs.wait(resp_json["job_id"], timeout)
        return job.to_dict()

    return _wait


@pytest.fixture
def korean_font() -> str:
    for f in FONT_CANDIDATES:
        if Path(f).exists():
            return f
    pytest.skip("한글 글꼴이 없어요")


def has_tesseract_kor() -> bool:
    if not shutil.which("tesseract"):
        return False
    try:
        import pytesseract

        return "kor" in pytesseract.get_languages(config="")
    except Exception:  # noqa: BLE001
        return False


needs_ocr = pytest.mark.skipif(not has_tesseract_kor(), reason="tesseract(kor)가 없어요")
needs_ffmpeg = pytest.mark.skipif(shutil.which("ffmpeg") is None and not os.environ.get("LOCALBISEO_FFMPEG"), reason="ffmpeg가 없어요")
