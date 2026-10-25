"""오프라인 라이선스 (Ed25519 서명).

키 형식: LB1.<base64url(payload JSON)>.<base64url(서명)>
발급은 tools/license_gen.py 로 하고, 앱에는 공개키(license_pubkey.pem)만 들어간다.
체험판은 첫 실행부터 TRIAL_DAYS일 동안 모든 기능을 쓸 수 있고,
그 뒤에는 코어 기능(회의록, 파일 마스킹, 이미지·영상)만 라이선스가 필요하다.
"""
from __future__ import annotations

import base64
import json
import sys
from datetime import date, datetime, timedelta
from pathlib import Path

from .db import Database
from .errors import AppError, LicenseRequired

TRIAL_DAYS = 14
PREFIX = "LB1"


def _pubkey_path() -> Path:
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


def state(db: Database) -> dict:
    started = db.get_setting("trial_started")
    if not started:
        started = date.today().isoformat()
        db.set_setting("trial_started", started)
    key = db.get_setting("license_key")
    if key:
        try:
            payload = verify(key)
            return {"status": "licensed", "holder": payload.get("name", ""), "id": payload.get("id", ""), "edition": payload.get("ed", "pro")}
        except AppError:
            pass
    end = date.fromisoformat(started) + timedelta(days=TRIAL_DAYS)
    left = (end - date.today()).days
    return {"status": "trial" if left >= 0 else "expired", "days_left": max(left, 0), "trial_ends": end.isoformat()}


def activate(db: Database, key: str) -> dict:
    payload = verify(key)
    db.set_setting("license_key", "".join(key.split()))
    db.set_setting("license_activated_at", datetime.now().isoformat(timespec="seconds"))
    return {"status": "licensed", "holder": payload.get("name", ""), "id": payload.get("id", ""), "edition": payload.get("ed", "pro")}


def require_pro(db: Database) -> None:
    if state(db)["status"] == "expired":
        raise LicenseRequired("체험 기간이 끝났어요. 설정 > 라이선스에서 키를 입력해 주세요.")
