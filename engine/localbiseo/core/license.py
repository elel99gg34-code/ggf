"""오프라인 라이선스 (Ed25519 서명).

키 형식: LB1.<base64url(payload JSON)>.<base64url(서명)>
발급은 라이선스 발급 서버(server/)나 tools/license_gen.py로 하고, 앱에는 공개키(license_pubkey.pem)만 들어간다.
무료 체험은 없다. 키를 등록하기 전에는 키 등록 말고는 어떤 기능도 쓸 수 없다(app.py의 미들웨어).
에디션: pro(정품), dev(개발자, 기한을 둘 수 있음)
"""
from __future__ import annotations

import base64
import json
import os
import sys
from datetime import date, datetime
from pathlib import Path

from .db import Database
from .errors import AppError, LicenseRequired

PREFIX = "LB1"
EDITIONS = {"pro": "정품", "dev": "개발자"}


def _pubkey_path() -> Path:
    # 소스로 돌릴 때만 다른 공개키를 쓸 수 있다(시연 녹화·테스트용). 배포판(PyInstaller)은 무시한다.
    override = os.environ.get("LOCALBISEO_LICENSE_PUBKEY")
    if override and not getattr(sys, "frozen", False):
        return Path(override)
    base = Path(getattr(sys, "_MEIPASS", Path(__file__).parent.parent))
    bundled = base / "localbiseo" / "core" / "license_pubkey.pem"
    return bundled if bundled.exists() else Path(__file__).parent / "license_pubkey.pem"


def _b64d(s: str) -> bytes:
    return base64.urlsafe_b64decode(s + "=" * (-len(s) % 4))


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def sign(payload: dict, private_key) -> str:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    return f"{PREFIX}.{_b64e(body)}.{_b64e(private_key.sign(body))}"


def verify(key: str, public_key=None) -> dict:
    from cryptography.exceptions import InvalidSignature
    from cryptography.hazmat.primitives.serialization import load_pem_public_key

    key = "".join(key.split())
    parts = key.split(".")
    if len(parts) != 3 or parts[0] != PREFIX:
        raise AppError("라이선스 키 형식이 올바르지 않아요.")
    try:
        body, sig = _b64d(parts[1]), _b64d(parts[2])
    except ValueError as e:
        raise AppError("라이선스 키 형식이 올바르지 않아요.") from e
    if public_key is None:
        public_key = load_pem_public_key(_pubkey_path().read_bytes())
    try:
        public_key.verify(sig, body)
    except InvalidSignature as e:
        raise AppError("유효하지 않은 라이선스 키예요.") from e
    payload = json.loads(body)
    exp = payload.get("exp")
    if exp and date.fromisoformat(exp) < date.today():
        raise AppError("기간이 끝난 라이선스 키예요.")
    return payload


def _licensed(payload: dict) -> dict:
    edition = payload.get("ed", "pro")
    return {
        "status": "licensed",
        "holder": payload.get("name", ""),
        "id": payload.get("id", ""),
        "edition": edition,
        "edition_label": EDITIONS.get(edition, edition),
        "expires": payload.get("exp"),
    }


def state(db: Database) -> dict:
    key = db.get_setting("license_key")
    if not key:
        return {"status": "unlicensed"}
    try:
        return _licensed(verify(key))
    except AppError as e:
        return {"status": "invalid", "error": e.message}


def is_licensed(db: Database) -> bool:
    return state(db)["status"] == "licensed"


def activate(db: Database, key: str) -> dict:
    payload = verify(key)
    db.set_setting("license_key", "".join(key.split()))
    db.set_setting("license_activated_at", datetime.now().isoformat(timespec="seconds"))
    return _licensed(payload)


def require_license(db: Database) -> None:
    st = state(db)
    if st["status"] == "unlicensed":
        raise LicenseRequired("라이선스 키를 등록해야 쓸 수 있어요.")
    if st["status"] != "licensed":
        raise LicenseRequired(f"{st['error']} 새 키를 등록해 주세요.")
