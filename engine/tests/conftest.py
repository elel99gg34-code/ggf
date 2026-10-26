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


@pytest.fixture(scope="session")
def signing_key(tmp_path_factory):
    """테스트 전용 서명 키. 소스 실행에서는 LOCALBISEO_LICENSE_PUBKEY로 공개키를 바꿀 수 있다."""
    from cryptography.hazmat.primitives import serialization
    from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

    key = Ed25519PrivateKey.generate()
    pub = tmp_path_factory.mktemp("license") / "pub.pem"
    pub.write_bytes(key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
    return key, pub


@pytest.fixture(autouse=True)
def isolated_home(tmp_path, monkeypatch, signing_key):
    home = tmp_path / "home"
    home.mkdir()
    monkeypatch.setenv("LOCALBISEO_HOME", str(home))
    monkeypatch.setenv("LOCALBISEO_LICENSE_PUBKEY", str(signing_key[1]))
    return home


@pytest.fixture
def issue(signing_key):
    from localbiseo.core import license

    def _issue(**payload) -> str:
        return license.sign({"id": "TEST-0001", "name": "테스트", "ed": "pro", **payload}, signing_key[0])

    return _issue


@pytest.fixture
def app(isolated_home, issue):
    from localbiseo.app import create_app
    from localbiseo.core import license

    app = create_app(data_dir=isolated_home)
    license.activate(app.state.ctx.db, issue())  # 기능 테스트는 정품 키가 있는 상태에서 돈다
    return app


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
