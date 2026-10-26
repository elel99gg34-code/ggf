from __future__ import annotations

import io
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "server"))
sys.path.insert(0, str(ROOT / "engine"))

import app as server  # noqa: E402
import mailer  # noqa: E402
from localbiseo.core import license as app_license  # noqa: E402

PIN = "482915"


class FakeTransport:
    def __init__(self):
        self.sent: list[dict] = []
        self.fail: Exception | None = None

    def send(self, cfg, row, attachments):
        if self.fail:
            raise self.fail
        self.sent.append({"cfg": cfg, "row": row, "attachments": attachments})

    def ping(self, cfg):
        return {"ok": True, "remaining": 99, "account": "shop@example.com"}


@pytest.fixture
def key():
    return Ed25519PrivateKey.generate()


@pytest.fixture
def env(tmp_path, key, monkeypatch):
    guide = tmp_path / "guide.pdf"
    guide.write_bytes(b"%PDF-1.4 test")
    monkeypatch.setattr(server, "GUIDE_PATH", guide)
    monkeypatch.setenv("PUBLIC_URL", "https://license.example.com")
    pem = key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8, serialization.NoEncryption()).decode()
    fake = FakeTransport()
    app = server.create_app(PIN, pem, f"sqlite:///{tmp_path / 'db.sqlite'}", mail_transport=fake, start_mailer=False)
    with TestClient(app) as c:
        assert c.post("/api/unlock", json={"pin": PIN}).status_code == 200
        c.put("/api/mail/settings", json={"relay_url": "https://script.google.com/macros/s/x/exec", "reply_to": "shop@example.com",
                                          "support_email": "shop@example.com", "download_windows": "https://drive.example.com/win",
                                          "seller_footer": "로컬비서 · 사업자등록번호 000-00-00000"})
        yield c, fake, app


def links_in(html: str) -> list[str]:
    return re.findall(r'href="([^"]+)"', html)


def test_issue_and_send_license_mail(env, key):
    c, fake, app = env
    lic = c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com", "send_email": True}).json()
    assert lic["mail"]["status"] == "queued"
    assert app.state.mailer.process_once() == 1
    (msg,) = fake.sent
    row = msg["row"]
    assert row["to_addr"] == "hong@example.com" and "홍길동" in row["subject"]
    assert msg["attachments"][0]["name"] == mailer.GUIDE_NAME and msg["attachments"][0]["type"] == "application/pdf"
    # 기본은 키를 바로 넣지 않고 확인 링크를 보낸다
    assert lic["key"] not in row["html"] and lic["key"] not in row["text"]
    hrefs = links_in(row["html"])
    key_link = next(h for h in hrefs if "/k/" in h)
    assert key_link.startswith(f"https://license.example.com/k/{lic['license_id']}/")
    assert any(h.endswith("/windows") for h in hrefs) and not any(h.endswith("/mac") for h in hrefs)  # 맥 링크는 설정 안 함
    assert "사업자등록번호" in row["html"] and "청약철회" in row["html"]
    assert c.get("/api/licenses").json()[0]["mail"]["status"] == "sent"


def test_key_page_records_first_view(env, key):
    c, fake, app = env
    lic = c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com", "send_email": True}).json()
    app.state.mailer.process_once()
    path = next(h for h in links_in(fake.sent[0]["row"]["html"]) if "/k/" in h).replace("https://license.example.com", "")
    first = c.get(path)
    assert first.status_code == 200 and "청약철회" in first.text and lic["key"] not in first.text
    assert c.get("/api/licenses").json()[0]["key_viewed_at"] is None  # 안내만 봐서는 열람이 아니다
    shown = c.get(path, params={"agree": "1"})
    assert lic["key"] in shown.text
    viewed = c.get("/api/licenses").json()[0]["key_viewed_at"]
    assert viewed
    # 한 번 연 뒤에는 동의 없이도 보이고, 처음 연 시각은 그대로다
    assert lic["key"] in c.get(path).text
    assert c.get("/api/licenses").json()[0]["key_viewed_at"] == viewed
    assert app_license.verify(lic["key"], key.public_key())["name"] == "홍길동"
    assert "키 열람" in c.get("/api/licenses.csv").text


def test_bad_links_and_revoked(env):
    c, fake, app = env
    lic = c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com"}).json()
    assert c.get(f"/k/{lic['license_id']}/wrongtoken").status_code == 404
    assert c.get(f"/d/{lic['license_id']}/wrongtoken/windows").status_code == 404
    c.post(f"/api/licenses/{lic['license_id']}/send")
    app.state.mailer.process_once()
    path = next(h for h in links_in(fake.sent[0]["row"]["html"]) if "/k/" in h).replace("https://license.example.com", "")
    c.post(f"/api/licenses/{lic['license_id']}/revoke", json={"reason": "환불"})
    r = c.get(path, params={"agree": "1"})
    assert r.status_code == 410 and lic["key"] not in r.text
    assert c.post(f"/api/licenses/{lic['license_id']}/send").status_code == 400


def test_download_links(env):
    c, fake, app = env
    c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com", "send_email": True})
    app.state.mailer.process_once()
    hrefs = [h.replace("https://license.example.com", "") for h in links_in(fake.sent[0]["row"]["html"])]
    win = next(h for h in hrefs if h.endswith("/windows"))
    r = c.get(win, follow_redirects=False)
    assert r.status_code == 302 and r.headers["location"] == "https://drive.example.com/win"
    mac = win.replace("/windows", "/mac")
    assert c.get(mac).status_code == 404  # 링크를 아직 안 넣었으면 준비 중 안내
    guide = c.get(win.replace("/windows", "/guide"))
    assert guide.status_code == 200 and guide.headers["content-type"] == "application/pdf"
    assert c.get("/api/licenses").json()[0]["downloads"] == 3


def test_daily_limit_and_retries(env):
    c, fake, app = env
    c.put("/api/mail/settings", json={**c.get("/api/mail").json()["settings"], "daily_limit": 2})
    for i in range(3):
        c.post("/api/licenses", json={"name": f"사람{i}", "email": f"p{i}@example.com", "send_email": True})
    assert app.state.mailer.process_once() == 2
    assert app.state.mailer.process_once() == 0  # 오늘 한도를 다 썼다
    assert c.get("/api/mail").json()["queued"] == 1
    tomorrow = datetime.now(timezone.utc) + timedelta(hours=25)
    assert app.state.mailer.process_once(now=tomorrow) == 1

    c.post("/api/licenses", json={"name": "실패", "email": "fail@example.com", "send_email": True})
    fake.fail = mailer.MailError("일시적인 오류")
    now = datetime.now(timezone.utc) + timedelta(hours=50)
    assert app.state.mailer.process_once(now=now) == 0
    row = c.get("/api/mail/outbox", params={"status": "queued"}).json()[0]
    assert row["attempts"] == 1 and "일시적인" in row["last_error"]
    for i in range(1, mailer.MAX_ATTEMPTS):
        app.state.mailer.process_once(now=now + timedelta(days=i))
    failed = c.get("/api/mail/outbox", params={"status": "failed"}).json()
    assert failed and failed[0]["to_addr"] == "fail@example.com"
    # 고치고 다시 보내기
    fake.fail = None
    assert c.post(f"/api/mail/{failed[0]['id']}/retry").status_code == 200
    assert app.state.mailer.process_once(now=now + timedelta(days=30)) == 1


def test_nothing_is_tried_before_gmail_is_connected(env):
    c, fake, app = env
    c.put("/api/mail/settings", json={**c.get("/api/mail").json()["settings"], "relay_url": ""})
    c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com", "send_email": True})
    assert app.state.mailer.process_once() == 0
    (row,) = c.get("/api/mail/outbox").json()
    assert row["status"] == "queued" and row["attempts"] == 0


def test_quota_error_postpones_everything(env):
    c, fake, app = env
    for i in range(2):
        c.post("/api/licenses", json={"name": f"사람{i}", "email": f"p{i}@example.com", "send_email": True})
    fake.fail = mailer.MailError("Service invoked too many times for one day: email.", quota=True)
    assert app.state.mailer.process_once() == 0
    queued = c.get("/api/mail/outbox", params={"status": "queued"}).json()
    assert len(queued) == 2 and all(q["attempts"] == 0 for q in queued)
    fake.fail = None
    assert app.state.mailer.process_once() == 0  # 3시간 뒤로 미뤄 둠
    assert app.state.mailer.process_once(now=datetime.now(timezone.utc) + timedelta(hours=4)) == 2


def test_notice_to_holders(env):
    c, fake, app = env
    c.post("/api/licenses/bulk", json={"csv": "홍길동,hong@example.com,W-1\n홍길동,HONG@example.com,W-2\n김민수,kim@example.com,W-3\n박지영,,W-4"})
    c.post("/api/licenses", json={"edition": "dev", "name": "개발", "email": "dev@example.com"})
    kim = c.get("/api/licenses", params={"q": "김민수"}).json()[0]
    c.post(f"/api/licenses/{kim['license_id']}/revoke", json={})
    assert c.post("/api/notices", json={"subject": "업데이트", "body": "새 버전이 나왔어요.\n\n받아 주세요.", "target": "pro"}).json() == {"queued": 1}
    assert c.post("/api/notices", json={"subject": "업데이트", "body": "안내", "target": "all"}).json() == {"queued": 2}
    app.state.mailer.process_once()
    subjects = {(m["row"]["to_addr"].lower(), m["row"]["subject"]) for m in fake.sent}
    assert ("hong@example.com", "[로컬비서] 업데이트") in subjects and ("dev@example.com", "[로컬비서] 업데이트") in subjects
    assert all(m["attachments"] == [] for m in fake.sent)  # 공지에는 설명서를 붙이지 않는다


def test_bulk_send_requires_emails(env):
    c, fake, app = env
    r = c.post("/api/licenses/bulk", json={"csv": "홍길동,hong@example.com\n박지영,", "send_email": True})
    assert r.status_code == 400 and "박지영" in r.json()["detail"]
    rows = c.post("/api/licenses/bulk", json={"csv": "홍길동,hong@example.com\n김민수,kim@example.com", "send_email": True}).json()
    assert all(r["mail"]["status"] == "queued" for r in rows)
    assert app.state.mailer.process_once() == 2


def test_settings_validation_and_status(env):
    c, fake, app = env
    base = c.get("/api/mail").json()
    assert base["configured"] and "SECRET" in base["script"] and base["guide_attached"]
    assert c.put("/api/mail/settings", json={**base["settings"], "relay_url": "https://evil.example.com"}).status_code == 400
    assert c.put("/api/mail/settings", json={**base["settings"], "download_mac": "http://x"}).status_code == 400
    assert c.put("/api/mail/settings", json={**base["settings"], "reply_to": "nope"}).status_code == 400
    r = c.put("/api/mail/settings", json={**base["settings"], "include_key": True, "attach_guide": False}).json()
    assert r["settings"]["include_key"] is True and r["settings"]["attach_guide"] is False
    lic = c.post("/api/licenses", json={"name": "홍길동", "email": "hong@example.com", "send_email": True}).json()
    app.state.mailer.process_once()
    assert lic["key"] in fake.sent[-1]["row"]["html"] and fake.sent[-1]["attachments"] == []
    assert c.post("/api/mail/ping").json()["account"] == "shop@example.com"
    assert c.post("/api/mail/test", json={"to": "me@example.com"}).json() == {"ok": True}
    assert fake.sent[-1]["row"]["subject"].startswith("[테스트]")
    preview = c.get("/api/mail/preview")
    assert preview.status_code == 200 and "unsafe-inline" in preview.headers["content-security-policy"]


def test_mail_api_needs_unlock(env):
    c, fake, app = env
    c.post("/api/lock")
    for method, path in [("get", "/api/mail"), ("put", "/api/mail/settings"), ("post", "/api/mail/test"), ("post", "/api/notices"),
                         ("get", "/api/mail/outbox"), ("get", "/api/mail/preview")]:
        assert c.request(method, path, json={}).status_code == 401, path


class FakeResponse(io.BytesIO):
    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False


def test_apps_script_relay_responses(monkeypatch):
    relay = mailer.AppsScriptRelay("https://script.google.com/macros/s/abc/exec", "s3cret")
    sent = {}

    def respond(body: bytes):
        def fake_urlopen(req, timeout=0):
            sent["payload"] = json.loads(req.data)
            return FakeResponse(body)
        monkeypatch.setattr(mailer, "urlopen", fake_urlopen)

    respond(b'{"ok": true, "remaining": 97}')
    assert relay.send("a@b.c", "제목", "<p>x</p>", "x", "로컬비서", "", [])["remaining"] == 97
    assert sent["payload"]["secret"] == "s3cret" and sent["payload"]["to"] == "a@b.c"
    respond(b"<html>Sign in</html>")
    with pytest.raises(mailer.MailError, match="모든 사용자"):
        relay.ping()
    respond(b'{"ok": false, "error": "unauthorized"}')
    with pytest.raises(mailer.MailError, match="비밀값"):
        relay.ping()
    respond(b'{"ok": false, "error": "Exception: Service invoked too many times for one day: email."}')
    with pytest.raises(mailer.MailError) as e:
        relay.ping()
    assert e.value.quota
    with pytest.raises(mailer.MailError, match="URL"):
        mailer.AppsScriptRelay("", "s").ping()
