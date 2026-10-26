from __future__ import annotations

import sys
from datetime import date, timedelta
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "engine"))

import app as server  # noqa: E402
from localbiseo.core import license as app_license  # noqa: E402

PIN = "482915"


@pytest.fixture
def key():
    return Ed25519PrivateKey.generate()


@pytest.fixture
def client(tmp_path, key):
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    with TestClient(server.create_app(PIN, pem, f"sqlite:///{tmp_path / 'db.sqlite'}")) as c:
        yield c


@pytest.fixture
def admin(client):
    assert client.post("/api/unlock", json={"pin": PIN}).status_code == 200
    return client


def verify_in_app(lic_key: str, key: Ed25519PrivateKey) -> dict:
    """앱 엔진이 실제로 쓰는 검증 함수로 확인한다."""
    return app_license.verify(lic_key, key.public_key())


def test_everything_is_locked_without_pin(client):
    assert client.get("/api/session").json()["unlocked"] is False
    for method, path in [("get", "/api/licenses"), ("post", "/api/licenses"), ("get", "/api/licenses.csv"), ("get", "/api/info"), ("post", "/api/licenses/bulk")]:
        assert client.request(method, path, json={}).status_code == 401, path
    page = client.get("/")
    assert page.status_code == 200 and "관리자 번호" in page.text
    assert "default-src 'self'" in page.headers["content-security-policy"]


def test_wrong_pin_counts_down_then_locks(client):
    for left in (4, 3, 2, 1):
        r = client.post("/api/unlock", json={"pin": "000000"})
        assert r.status_code == 403 and f"{left}번 더" in r.json()["detail"]
    assert client.post("/api/unlock", json={"pin": "000000"}).status_code == 429
    # 잠긴 동안은 맞는 번호도 안 된다
    r = client.post("/api/unlock", json={"pin": PIN})
    assert r.status_code == 429 and "분 뒤" in r.json()["detail"]
    assert client.get("/api/session").json()["locked_for"] > 0


def test_unlock_issue_pro_and_dev(admin, key):
    r = admin.post("/api/licenses", json={"edition": "pro", "name": "홍길동", "email": "hong@example.com", "order_no": "W-1"})
    assert r.status_code == 200, r.text
    pro = r.json()
    assert pro["license_id"].startswith("LB-") and pro["edition_label"] == "정품" and pro["expires"] is None
    payload = verify_in_app(pro["key"], key)
    assert payload["name"] == "홍길동" and payload["ed"] == "pro" and payload["id"] == pro["license_id"]

    until = (date.today() + timedelta(days=30)).isoformat()
    dev = admin.post("/api/licenses", json={"edition": "dev", "name": "개발 테스트", "expires": until}).json()
    assert dev["license_id"].startswith("DEV-") and dev["expires"] == until
    assert verify_in_app(dev["key"], key)["exp"] == until

    # 정품은 기한 없이, 기한은 오늘 이후
    assert admin.post("/api/licenses", json={"edition": "pro", "name": "x", "expires": until}).status_code == 400
    assert admin.post("/api/licenses", json={"edition": "dev", "name": "x", "expires": date.today().isoformat()}).status_code == 400
    assert admin.post("/api/licenses", json={"edition": "vip", "name": "x"}).status_code == 400
    assert admin.post("/api/licenses", json={"edition": "pro", "name": ""}).status_code == 422


def test_keys_from_another_server_fail_in_app(admin):
    other = Ed25519PrivateKey.generate()
    lic = admin.post("/api/licenses", json={"name": "홍길동"}).json()
    with pytest.raises(app_license.AppError):
        app_license.verify(lic["key"], other.public_key())


def test_list_search_revoke_export(admin):
    for name, email in [("홍길동", "hong@example.com"), ("김민수", "kim@example.com")]:
        admin.post("/api/licenses", json={"name": name, "email": email, "order_no": f"W-{name}"})
    admin.post("/api/licenses", json={"edition": "dev", "name": "개발"})
    assert len(admin.get("/api/licenses").json()) == 3
    assert [r["name"] for r in admin.get("/api/licenses", params={"q": "kim@"}).json()] == ["김민수"]
    assert [r["name"] for r in admin.get("/api/licenses", params={"edition": "dev"}).json()] == ["개발"]
    target = admin.get("/api/licenses", params={"q": "홍길동"}).json()[0]
    r = admin.post(f"/api/licenses/{target['license_id']}/revoke", json={"reason": "환불"})
    assert r.json()["revoked_at"] and r.json()["revoke_reason"] == "환불"
    assert admin.post(f"/api/licenses/{target['license_id']}/revoke", json={}).status_code == 404
    csv_text = admin.get("/api/licenses.csv").text
    assert csv_text.startswith("﻿라이선스 번호") and "환불" in csv_text and csv_text.count("LB1.") == 3


def test_bulk_issue_with_and_without_header(admin, key):
    rows = admin.post("/api/licenses/bulk", json={"csv": "이름,이메일,주문번호\n홍길동,hong@example.com,W-1\n\n김민수,,W-2\n"}).json()
    assert [(r["name"], r["email"], r["order_no"]) for r in rows] == [("홍길동", "hong@example.com", "W-1"), ("김민수", "", "W-2")]
    assert all(verify_in_app(r["key"], key)["ed"] == "pro" for r in rows)
    rows = admin.post("/api/licenses/bulk", json={"csv": "﻿박지영,park@example.com,W-3"}).json()
    assert rows[0]["name"] == "박지영" and rows[0]["order_no"] == "W-3"
    bad = admin.post("/api/licenses/bulk", json={"csv": "이름,이메일\n,a@b.c"})
    assert bad.status_code == 400 and "이름이 빈 줄" in bad.json()["detail"]
    ids = [r["license_id"] for r in admin.get("/api/licenses").json()]
    assert len(ids) == len(set(ids)) == 3


def test_info_reports_storage(admin, key, tmp_path, monkeypatch):
    info = admin.get("/api/info").json()
    assert info["durable"] is True and "BEGIN PUBLIC KEY" in info["public_key"]
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    monkeypatch.setattr(server, "DEFAULT_DB", tmp_path / "local.db")  # DATABASE_URL 없이 쓰면 임시 SQLite
    with TestClient(server.create_app(PIN, pem, None)) as c:
        c.post("/api/unlock", json={"pin": PIN})
        assert c.get("/api/info").json()["durable"] is False


def test_lock_ends_session(admin):
    assert admin.get("/api/licenses").status_code == 200
    admin.post("/api/lock")
    assert admin.get("/api/licenses").status_code == 401


def test_pin_and_key_come_from_env(monkeypatch, tmp_path, key):
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    monkeypatch.setenv("LICENSE_PRIVATE_KEY", pem.replace("\n", "\\n"))  # 한 줄로 넣어도 된다
    monkeypatch.setenv("ADMIN_PIN", PIN)
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{tmp_path / 'env.sqlite'}")
    with TestClient(server.create_app_from_env()) as c:
        assert c.post("/api/unlock", json={"pin": PIN}).status_code == 200
    monkeypatch.setenv("ADMIN_PIN", "123")
    with pytest.raises(RuntimeError):
        server.create_app_from_env()
    assert server.database_url("postgres://u:p@h/db") == "postgresql+psycopg://u:p@h/db"
