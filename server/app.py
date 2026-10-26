"""로컬비서 라이선스 발급 서버 (관리자 전용).

관리자 번호를 넣어야 잠금이 풀리고, 정품·개발자 라이선스 키를 발급한다.
키는 앱(engine/localbiseo/core/license.py)과 같은 형식으로 서명하므로 앱은 인터넷 없이 키를 확인한다.

환경변수
  ADMIN_PIN            관리자 잠금 해제 번호 (필수). 코드나 저장소에 넣지 않는다.
  LICENSE_PRIVATE_KEY  서명 개인키 PEM (필수). 앱에 든 license_pubkey.pem과 짝이어야 한다.
  DATABASE_URL         발급 기록 DB (없으면 이 폴더의 licenses.db)

실행: uvicorn app:create_app_from_env --factory
"""
from __future__ import annotations

import base64
import csv
import hashlib
import hmac
import html
import io
import json
import os
import secrets
import threading
import time
from contextlib import asynccontextmanager
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse, HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, Column, Date, DateTime, Integer, MetaData, String, Table, Text, create_engine, func, or_, select, update

from mailer import APPS_SCRIPT, GUIDE_NAME, AppsScriptRelay, MailError, Mailer, guide_attachment, license_mail, notice_mail, valid_email

PREFIX = "LB1"
EDITIONS = {"pro": "정품", "dev": "개발자"}
ID_PREFIX = {"pro": "LB", "dev": "DEV"}
SESSION_COOKIE = "lb_admin"
SESSION_MINUTES = 30  # 아무것도 안 하면 30분 뒤 다시 잠긴다
MAX_FAILS_PER_IP = 5
MAX_FAILS_TOTAL = 20  # 주소를 바꿔 가며 찍어 보는 경우를 막는다
LOCK_MINUTES = 15
HERE = Path(__file__).parent
DEFAULT_DB = HERE / "licenses.db"
GUIDE_PATH = HERE / "assets" / "guide.pdf"
SETTING_DEFAULTS = {
    "relay_url": "", "sender_name": "로컬비서", "reply_to": "", "support_email": "", "download_windows": "", "download_mac": "",
    "seller_footer": "", "include_key": "0", "attach_guide": "1", "daily_limit": "90", "public_url": "",
}

metadata = MetaData()
licenses = Table(
    "licenses",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("license_id", String(40), unique=True, nullable=False),
    Column("edition", String(10), nullable=False),
    Column("name", String(100), nullable=False),
    Column("email", String(200), nullable=False, default=""),
    Column("order_no", String(100), nullable=False, default=""),
    Column("memo", Text, nullable=False, default=""),
    Column("expires", Date, nullable=True),
    Column("key", Text, nullable=False),
    Column("issued_at", DateTime(timezone=True), nullable=False),
    Column("revoked_at", DateTime(timezone=True), nullable=True),
    Column("revoke_reason", Text, nullable=False, default=""),
)
settings_table = Table("settings", metadata, Column("key", String(60), primary_key=True), Column("value", Text, nullable=False, default=""))
emails = Table(
    "emails",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("license_id", String(40), nullable=True, index=True),
    Column("kind", String(20), nullable=False),  # license / notice / test
    Column("to_addr", String(200), nullable=False),
    Column("subject", String(300), nullable=False),
    Column("html", Text, nullable=False),
    Column("text", Text, nullable=False),
    Column("attach_guide", Boolean, nullable=False, default=False),
    Column("status", String(10), nullable=False, default="queued"),  # queued / sent / failed
    Column("attempts", Integer, nullable=False, default=0),
    Column("last_error", Text, nullable=False, default=""),
    Column("created_at", DateTime(timezone=True), nullable=False),
    Column("next_try_at", DateTime(timezone=True), nullable=True),
    Column("sent_at", DateTime(timezone=True), nullable=True),
)
# 고객이 '라이선스 키 확인하기'로 키를 처음 연 때. 환불 정책의 '제공 개시' 기록이다.
key_views = Table(
    "key_views",
    metadata,
    Column("license_id", String(40), primary_key=True),
    Column("first_at", DateTime(timezone=True), nullable=False),
    Column("last_at", DateTime(timezone=True), nullable=False),
    Column("count", Integer, nullable=False, default=1),
    Column("ip", String(60), nullable=False, default=""),
)
downloads = Table(
    "downloads",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("license_id", String(40), nullable=False, index=True),
    Column("what", String(10), nullable=False),
    Column("at", DateTime(timezone=True), nullable=False),
    Column("ip", String(60), nullable=False, default=""),
)


def _utc(dt: datetime | None) -> datetime | None:
    """SQLite는 시간대를 빼고 돌려준다. 늘 UTC로 저장하므로 UTC로 되돌린다."""
    if dt is None:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt.astimezone(timezone.utc)


def _iso(dt: datetime | None) -> str | None:
    return _utc(dt).isoformat(timespec="seconds") if dt else None


def _b64e(b: bytes) -> str:
    return base64.urlsafe_b64encode(b).decode().rstrip("=")


def sign(payload: dict, key: Ed25519PrivateKey) -> str:
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode()
    return f"{PREFIX}.{_b64e(body)}.{_b64e(key.sign(body))}"


def database_url(url: str | None) -> str:
    if not url:
        return f"sqlite:///{DEFAULT_DB}"
    # Render는 postgres:// 형태로 준다. SQLAlchemy에는 드라이버(psycopg)를 적어 줘야 한다.
    for old in ("postgres://", "postgresql://"):
        if url.startswith(old):
            return "postgresql+psycopg://" + url[len(old):]
    return url


class Guard:
    """관리자 번호 확인, 틀린 횟수 제한, 잠금 해제 세션 (메모리에만 둔다. 서버가 다시 뜨면 다시 잠긴다)."""

    def __init__(self, pin: str):
        self.pin = pin
        self.lock = threading.Lock()
        self.fails: dict[str, list[float]] = {}
        self.all_fails: list[float] = []
        self.sessions: dict[str, float] = {}

    def _recent(self, times: list[float], now: float) -> list[float]:
        return [t for t in times if now - t < LOCK_MINUTES * 60]

    def locked_for(self, ip: str, now: float) -> int:
        """잠금이 풀릴 때까지 남은 초 (0이면 안 잠김)."""
        mine = self._recent(self.fails.get(ip, []), now)
        everyone = self._recent(self.all_fails, now)
        waits = []
        if len(mine) >= MAX_FAILS_PER_IP:
            waits.append(mine[-MAX_FAILS_PER_IP] + LOCK_MINUTES * 60 - now)
        if len(everyone) >= MAX_FAILS_TOTAL:
            waits.append(everyone[-MAX_FAILS_TOTAL] + LOCK_MINUTES * 60 - now)
        return int(max(waits)) + 1 if waits else 0

    def unlock(self, ip: str, pin: str) -> tuple[str | None, int, int]:
        """(세션 토큰, 남은 시도 횟수, 잠금 남은 초)"""
        now = time.time()
        with self.lock:
            wait = self.locked_for(ip, now)
            if wait:
                return None, 0, wait
            if hmac.compare_digest(pin.encode(), self.pin.encode()):
                self.fails.pop(ip, None)
                token = secrets.token_urlsafe(32)
                self.sessions[token] = now + SESSION_MINUTES * 60
                return token, MAX_FAILS_PER_IP, 0
            self.fails[ip] = self._recent(self.fails.get(ip, []), now) + [now]
            self.all_fails = self._recent(self.all_fails, now) + [now]
            left = MAX_FAILS_PER_IP - len(self.fails[ip])
            return None, max(left, 0), self.locked_for(ip, now)

    def check(self, token: str | None) -> bool:
        now = time.time()
        with self.lock:
            self.sessions = {t: exp for t, exp in self.sessions.items() if exp > now}
            if not token or token not in self.sessions:
                return False
            self.sessions[token] = now + SESSION_MINUTES * 60
            return True

    def end(self, token: str | None) -> None:
        with self.lock:
            self.sessions.pop(token or "", None)


def client_ip(request: Request) -> str:
    # Render 앞단 프록시가 붙인 마지막 주소가 실제 접속 주소다.
    fwd = request.headers.get("x-forwarded-for", "")
    return fwd.split(",")[-1].strip() if fwd else (request.client.host if request.client else "?")


class UnlockIn(BaseModel):
    pin: str = Field(max_length=32)


class IssueIn(BaseModel):
    edition: str = "pro"
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(default="", max_length=200)
    order_no: str = Field(default="", max_length=100)
    memo: str = Field(default="", max_length=1000)
    expires: date | None = None
    send_email: bool = False


class BulkIn(BaseModel):
    csv: str = Field(max_length=2_000_000)
    edition: str = "pro"
    expires: date | None = None
    send_email: bool = False


class MailSettingsIn(BaseModel):
    relay_url: str = Field(default="", max_length=500)
    sender_name: str = Field(default="로컬비서", max_length=60)
    reply_to: str = Field(default="", max_length=200)
    support_email: str = Field(default="", max_length=200)
    download_windows: str = Field(default="", max_length=1000)
    download_mac: str = Field(default="", max_length=1000)
    seller_footer: str = Field(default="", max_length=1000)
    include_key: bool = False
    attach_guide: bool = True
    daily_limit: int = Field(default=90, ge=1, le=2000)


class TestMailIn(BaseModel):
    to: str = Field(max_length=200)


class NoticeIn(BaseModel):
    subject: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=20000)
    target: str = "all"  # all / pro / dev


class RevokeIn(BaseModel):
    reason: str = Field(default="", max_length=500)


def _row(r) -> dict:
    d = dict(r._mapping)
    return {
        "license_id": d["license_id"],
        "edition": d["edition"],
        "edition_label": EDITIONS.get(d["edition"], d["edition"]),
        "name": d["name"],
        "email": d["email"],
        "order_no": d["order_no"],
        "memo": d["memo"],
        "expires": d["expires"].isoformat() if d["expires"] else None,
        "key": d["key"],
        "issued_at": _iso(d["issued_at"]),
        "revoked_at": _iso(d["revoked_at"]),
        "revoke_reason": d["revoke_reason"],
    }


CSV_ALIASES = {"name": ("이름", "name", "성명", "서포터"), "email": ("이메일", "email", "메일"), "order_no": ("주문번호", "order", "order_no", "후원번호")}


def parse_people(text: str) -> list[dict]:
    """'이름,이메일,주문번호' CSV. 첫 줄이 머리글이면 열 이름으로 찾는다."""
    rows = [r for r in csv.reader(io.StringIO(text.lstrip("﻿"))) if any(c.strip() for c in r)]
    if not rows:
        return []
    head = [c.strip().lower() for c in rows[0]]
    cols = {f: next((i for i, h in enumerate(head) if h in names), None) for f, names in CSV_ALIASES.items()}
    if cols["name"] is not None:
        rows = rows[1:]
    else:
        cols = {"name": 0, "email": 1, "order_no": 2}
    out = []
    for r in rows:
        get = lambda f: r[cols[f]].strip() if cols[f] is not None and cols[f] < len(r) else ""  # noqa: E731
        out.append({"name": get("name"), "email": get("email"), "order_no": get("order_no")})
    return out


class MailStore:
    """Mailer가 쓰는 emails·settings 표 읽기/쓰기."""

    def __init__(self, engine):
        self.engine = engine

    def settings(self) -> dict:
        with self.engine.connect() as conn:
            stored = {r.key: r.value for r in conn.execute(select(settings_table))}
        raw = {**SETTING_DEFAULTS, **stored}
        return {**raw, "include_key": raw["include_key"] == "1", "attach_guide": raw["attach_guide"] == "1", "daily_limit": int(raw["daily_limit"] or 90)}

    def save_settings(self, values: dict) -> None:
        with self.engine.begin() as conn:
            for k, v in values.items():
                v = ("1" if v else "0") if isinstance(v, bool) else str(v)
                if conn.execute(update(settings_table).where(settings_table.c.key == k).values(value=v)).rowcount == 0:
                    conn.execute(settings_table.insert().values(key=k, value=v))

    def daily_limit(self) -> int:
        return self.settings()["daily_limit"]

    def queued_count(self) -> int:
        with self.engine.connect() as conn:
            return conn.execute(select(func.count()).select_from(emails).where(emails.c.status == "queued")).scalar_one()

    def ready(self) -> bool:
        return self.settings()["relay_url"].startswith("https://script.google.com/")

    def due_emails(self, now: datetime) -> list[dict]:
        with self.engine.connect() as conn:
            rows = conn.execute(
                select(emails).where(emails.c.status == "queued", or_(emails.c.next_try_at.is_(None), emails.c.next_try_at <= now))
                .order_by(emails.c.id).limit(50)
            )
            return [dict(r._mapping) for r in rows]

    def sent_since(self, since: datetime) -> int:
        with self.engine.connect() as conn:
            return conn.execute(select(func.count()).select_from(emails).where(emails.c.sent_at.is_not(None), emails.c.sent_at >= since)).scalar_one()

    def mark_sent(self, email_id: int, now: datetime) -> None:
        with self.engine.begin() as conn:
            conn.execute(update(emails).where(emails.c.id == email_id).values(status="sent", sent_at=now, last_error="", next_try_at=None))

    def mark_failed(self, email_id: int, attempts: int, error: str, retry_at: datetime | None) -> None:
        values = {"attempts": attempts, "last_error": error[:2000], "next_try_at": retry_at}
        values["status"] = "queued" if retry_at else "failed"
        with self.engine.begin() as conn:
            conn.execute(update(emails).where(emails.c.id == email_id).values(**values))

    def postpone_all(self, until: datetime, error: str) -> None:
        with self.engine.begin() as conn:
            conn.execute(update(emails).where(emails.c.status == "queued").values(next_try_at=until, last_error=error[:2000]))


class RelayTransport:
    """실제 발송: Apps Script 웹 앱으로 보낸다. 테스트에서는 가짜로 바꿔 끼운다."""

    def __init__(self, secret: str):
        self.secret = secret

    def send(self, cfg: dict, row: dict, attachments: list[dict], more: bool = False) -> None:
        AppsScriptRelay(cfg["relay_url"], self.secret).send(
            row["to_addr"], row["subject"], row["html"], row["text"], cfg["sender_name"], cfg["reply_to"] or cfg["support_email"], attachments,
            server_url=cfg["public_url"], more=more,
        )

    def ping(self, cfg: dict) -> dict:
        return AppsScriptRelay(cfg["relay_url"], self.secret).ping()


def page(title: str, body: str, status: int = 200) -> HTMLResponse:
    """고객이 메일 링크로 여는 화면."""
    return HTMLResponse(
        '<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        f'<meta name="robots" content="noindex, nofollow"><title>{html.escape(title)}</title><link rel="stylesheet" href="/static/public.css"></head>'
        f'<body><main class="card"><div class="brand"><span class="mark">비</span> 로컬비서</div>{body}</main>'
        '<script src="/static/public.js"></script></body></html>',
        status_code=status,
        headers={"Cache-Control": "no-store"},
    )


def create_app(pin: str, private_key_pem: str, db_url: str | None = None, mail_transport=None, start_mailer: bool = True) -> FastAPI:
    if not pin or len(pin) < 6:
        raise RuntimeError("ADMIN_PIN을 6자리 이상으로 설정해 주세요.")
    signing_key = serialization.load_pem_private_key(private_key_pem.encode(), password=None)
    if not isinstance(signing_key, Ed25519PrivateKey):
        raise RuntimeError("LICENSE_PRIVATE_KEY는 Ed25519 개인키여야 해요.")
    public_pem = signing_key.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo).decode()
    fingerprint = hashlib.sha256(public_pem.encode()).hexdigest()[:16]
    engine = create_engine(database_url(db_url), pool_pre_ping=True)
    durable = engine.dialect.name != "sqlite" or bool(db_url)  # DATABASE_URL 없이 쓰는 SQLite는 Render에서 재시작하면 사라진다
    metadata.create_all(engine)
    guard = Guard(pin)
    # 메일 링크와 메일 중계용 비밀값은 서명 키에서 뽑는다. 따로 보관할 것이 늘지 않는다.
    raw_key = signing_key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    link_secret = hmac.new(raw_key, b"localbiseo-links", hashlib.sha256).digest()
    relay_secret = hmac.new(raw_key, b"localbiseo-mail-relay", hashlib.sha256).hexdigest()[:40]
    store = MailStore(engine)
    transport = mail_transport or RelayTransport(relay_secret)

    def deliver(row: dict) -> None:
        cfg = store.settings()
        # 이 메일 말고도 남아 있으면 Apps Script가 잠든 서버를 한 시간마다 깨우게 한다.
        transport.send(cfg, row, guide_attachment(GUIDE_PATH) if row["attach_guide"] else [], more=store.queued_count() > 1)

    mailer = Mailer(store, deliver)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        if start_mailer:
            mailer.start()
        yield
        mailer.stop()

    app = FastAPI(title="로컬비서 라이선스 발급", docs_url=None, redoc_url=None, openapi_url=None, lifespan=lifespan)
    app.state.guard = guard
    app.state.mailer = mailer
    app.state.store = store

    @app.middleware("http")
    async def headers(request: Request, call_next):
        res = await call_next(request)
        res.headers["X-Frame-Options"] = "DENY"
        res.headers["X-Content-Type-Options"] = "nosniff"
        res.headers["Referrer-Policy"] = "no-referrer"
        res.headers.setdefault("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'")
        if request.url.path.startswith("/api/"):
            res.headers["Cache-Control"] = "no-store"
        return res

    def admin(request: Request) -> str:
        token = request.cookies.get(SESSION_COOKIE)
        if not guard.check(token):
            raise HTTPException(401, "잠겨 있어요. 관리자 번호를 입력해 주세요.")
        return token

    def issue(conn, body: IssueIn) -> dict:
        if body.edition not in EDITIONS:
            raise HTTPException(400, "종류는 정품 또는 개발자예요.")
        if body.edition == "pro" and body.expires:
            raise HTTPException(400, "정품 라이선스는 기한 없이 발급해요.")
        if body.expires and body.expires <= date.today():
            raise HTTPException(400, "기한은 오늘 이후 날짜로 정해 주세요.")
        now = datetime.now(timezone.utc)
        temp = f"tmp-{secrets.token_hex(8)}"
        row_id = conn.execute(
            licenses.insert().values(
                license_id=temp, edition=body.edition, name=body.name.strip(), email=body.email.strip(),
                order_no=body.order_no.strip(), memo=body.memo.strip(), expires=body.expires, key="", issued_at=now,
            )
        ).inserted_primary_key[0]
        license_id = f"{ID_PREFIX[body.edition]}-{now.year}-{row_id:05d}"
        payload = {"id": license_id, "name": body.name.strip(), "ed": body.edition, "iat": now.date().isoformat()}
        if body.expires:
            payload["exp"] = body.expires.isoformat()
        key = sign(payload, signing_key)
        conn.execute(update(licenses).where(licenses.c.id == row_id).values(license_id=license_id, key=key))
        return _row(conn.execute(select(licenses).where(licenses.c.id == row_id)).one())

    def link_token(license_id: str) -> str:
        return _b64e(hmac.new(link_secret, license_id.encode(), hashlib.sha256).digest())[:22]

    def public_base(request: Request) -> str:
        env = os.environ.get("PUBLIC_URL") or os.environ.get("RENDER_EXTERNAL_URL")
        if env:
            return env.rstrip("/")
        proto = request.headers.get("x-forwarded-proto", request.url.scheme)
        return f"{proto}://{request.headers.get('host', request.url.netloc)}"

    def get_license(conn, license_id: str) -> dict | None:
        r = conn.execute(select(licenses).where(licenses.c.license_id == license_id)).first()
        return _row(r) if r else None

    def enqueue(conn, kind: str, to: str, subject: str, html_body: str, text: str, license_id: str | None = None, attach: bool = False) -> int:
        now = datetime.now(timezone.utc)
        return conn.execute(emails.insert().values(
            license_id=license_id, kind=kind, to_addr=to.strip(), subject=subject, html=html_body, text=text, attach_guide=attach,
            status="queued", attempts=0, last_error="", created_at=now, next_try_at=now,
        )).inserted_primary_key[0]

    def remember_base(base: str) -> None:
        if store.settings()["public_url"] != base:
            store.save_settings({"public_url": base})

    def enqueue_license_mail(conn, lic: dict, base: str) -> int:
        if lic["revoked_at"]:
            raise HTTPException(400, "취소된 라이선스예요.")
        if not valid_email(lic["email"]):
            raise HTTPException(400, f"{lic['name']}님의 이메일 주소가 없거나 올바르지 않아요.")
        cfg = store.settings()
        lid, tok = lic["license_id"], link_token(lic["license_id"])
        links = {
            "key": f"{base}/k/{lid}/{tok}",
            "guide": f"{base}/d/{lid}/{tok}/guide",
            "windows": f"{base}/d/{lid}/{tok}/windows" if cfg["download_windows"] else "",
            "mac": f"{base}/d/{lid}/{tok}/mac" if cfg["download_mac"] else "",
        }
        subject, html_body, text = license_mail(lic, links, cfg)
        return enqueue(conn, "license", lic["email"], subject, html_body, text, lid, attach=cfg["attach_guide"])

    def license_extras(conn, rows: list[dict]) -> list[dict]:
        """목록에 메일 상태, 키 열람, 받은 횟수를 붙인다."""
        ids = [r["license_id"] for r in rows]
        if not ids:
            return rows
        views = {v.license_id: v for v in conn.execute(select(key_views).where(key_views.c.license_id.in_(ids)))}
        mails: dict[str, dict] = {}
        for m in conn.execute(select(emails.c.license_id, emails.c.status, emails.c.last_error, emails.c.sent_at, emails.c.id)
                              .where(emails.c.license_id.in_(ids), emails.c.kind == "license").order_by(emails.c.id)):
            mails[m.license_id] = {"status": m.status, "error": m.last_error, "sent_at": _iso(m.sent_at)}
        counts = dict(conn.execute(select(downloads.c.license_id, func.count()).where(downloads.c.license_id.in_(ids)).group_by(downloads.c.license_id)).all())
        for r in rows:
            v = views.get(r["license_id"])
            r["key_viewed_at"] = _iso(v.first_at) if v else None
            r["mail"] = mails.get(r["license_id"])
            r["downloads"] = counts.get(r["license_id"], 0)
        return rows

    @app.get("/healthz")
    def healthz():
        return {"ok": True}

    @app.get("/api/session")
    def session(request: Request):
        return {"unlocked": guard.check(request.cookies.get(SESSION_COOKIE)), "locked_for": guard.locked_for(client_ip(request), time.time())}

    @app.post("/api/unlock")
    def unlock(body: UnlockIn, request: Request, response: Response):
        token, left, wait = guard.unlock(client_ip(request), body.pin.strip())
        if wait:
            raise HTTPException(429, f"너무 많이 틀려서 잠겼어요. {wait // 60 + 1}분 뒤에 다시 해 주세요.")
        if not token:
            raise HTTPException(403, f"번호가 틀렸어요. {left}번 더 틀리면 {LOCK_MINUTES}분 동안 잠겨요.")
        secure = request.headers.get("x-forwarded-proto", request.url.scheme) == "https"
        response.set_cookie(SESSION_COOKIE, token, httponly=True, samesite="strict", secure=secure, max_age=12 * 3600)
        return {"unlocked": True}

    @app.post("/api/lock")
    def lock(request: Request, response: Response):
        guard.end(request.cookies.get(SESSION_COOKIE))
        response.delete_cookie(SESSION_COOKIE)
        return {"unlocked": False}

    @app.get("/api/info")
    def info(_: str = Depends(admin)):
        return {"public_key": public_pem, "fingerprint": fingerprint, "editions": EDITIONS, "durable": durable}

    @app.get("/api/licenses")
    def list_licenses(q: str = "", edition: str = "", limit: int = 300, _: str = Depends(admin)):
        stmt = select(licenses).order_by(licenses.c.id.desc()).limit(min(max(limit, 1), 2000))
        if edition in EDITIONS:
            stmt = stmt.where(licenses.c.edition == edition)
        if q.strip():
            like = f"%{q.strip()}%"
            stmt = stmt.where(or_(*(c.ilike(like) for c in (licenses.c.license_id, licenses.c.name, licenses.c.email, licenses.c.order_no, licenses.c.memo))))
        with engine.connect() as conn:
            return license_extras(conn, [_row(r) for r in conn.execute(stmt)])

    @app.post("/api/licenses")
    def create_license(body: IssueIn, request: Request, _: str = Depends(admin)):
        if body.send_email and not valid_email(body.email):
            raise HTTPException(400, "메일로 보내려면 올바른 이메일 주소를 넣어 주세요.")
        if body.send_email:
            remember_base(public_base(request))
        with engine.begin() as conn:
            lic = issue(conn, body)
            if body.send_email:
                enqueue_license_mail(conn, lic, public_base(request))
            out = license_extras(conn, [lic])[0]
        mailer.wake()
        return out

    @app.post("/api/licenses/bulk")
    def bulk(body: BulkIn, request: Request, _: str = Depends(admin)):
        people = parse_people(body.csv)
        missing = [i + 1 for i, p in enumerate(people) if not p["name"]]
        if not people:
            raise HTTPException(400, "명단이 비어 있어요.")
        if missing:
            raise HTTPException(400, f"이름이 빈 줄이 있어요: {', '.join(map(str, missing[:10]))}번째")
        if len(people) > 5000:
            raise HTTPException(400, "한 번에 5,000명까지 발급할 수 있어요.")
        if body.send_email:
            bad = [p["name"] for p in people if not valid_email(p["email"])]
            if bad:
                raise HTTPException(400, f"이메일 주소가 없거나 올바르지 않은 사람이 있어요: {', '.join(bad[:10])}")
        base = public_base(request)
        if body.send_email:
            remember_base(base)
        with engine.begin() as conn:
            issued = [issue(conn, IssueIn(edition=body.edition, expires=body.expires, **p)) for p in people]
            if body.send_email:
                for lic in issued:
                    enqueue_license_mail(conn, lic, base)
            issued = license_extras(conn, issued)
        mailer.wake()
        return issued

    @app.post("/api/licenses/{license_id}/revoke")
    def revoke(license_id: str, body: RevokeIn, _: str = Depends(admin)):
        with engine.begin() as conn:
            res = conn.execute(
                update(licenses)
                .where(licenses.c.license_id == license_id, licenses.c.revoked_at.is_(None))
                .values(revoked_at=datetime.now(timezone.utc), revoke_reason=body.reason.strip())
            )
            if res.rowcount == 0:
                raise HTTPException(404, "없거나 이미 취소된 라이선스예요.")
            return _row(conn.execute(select(licenses).where(licenses.c.license_id == license_id)).one())

    @app.get("/api/licenses.csv")
    def export(_: str = Depends(admin)):
        buf = io.StringIO()
        w = csv.writer(buf)
        w.writerow(["라이선스 번호", "종류", "이름", "이메일", "주문번호", "메모", "기한", "발급일(UTC)", "메일", "키 열람(UTC)", "설치 파일 받은 횟수",
                    "취소일(UTC)", "취소 사유", "라이선스 키"])
        with engine.connect() as conn:
            rows = license_extras(conn, [_row(r) for r in conn.execute(select(licenses).order_by(licenses.c.id))])
            for d in rows:
                mail = {"sent": "보냄", "queued": "대기", "failed": "실패"}.get((d["mail"] or {}).get("status"), "")
                w.writerow([d["license_id"], d["edition_label"], d["name"], d["email"], d["order_no"], d["memo"], d["expires"] or "",
                            d["issued_at"], mail, d["key_viewed_at"] or "", d["downloads"], d["revoked_at"] or "", d["revoke_reason"], d["key"]])
        name = f"licenses-{date.today().isoformat()}.csv"
        # 엑셀에서 한글이 깨지지 않게 BOM을 붙인다.
        return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{name}"'})

    # --- 메일 -----------------------------------------------------------------
    @app.get("/api/mail")
    def mail_status(_: str = Depends(admin)):
        cfg = store.settings()
        now = datetime.now(timezone.utc)
        with engine.connect() as conn:
            counts = dict(conn.execute(select(emails.c.status, func.count()).group_by(emails.c.status)).all())
        return {
            "settings": cfg,
            "configured": cfg["relay_url"].startswith("https://script.google.com/"),
            "sent_24h": store.sent_since(now - timedelta(hours=24)),
            "queued": counts.get("queued", 0),
            "failed": counts.get("failed", 0),
            "guide_attached": GUIDE_PATH.exists(),
            "script": APPS_SCRIPT % {"secret": relay_secret},
        }

    @app.put("/api/mail/settings")
    def save_mail_settings(body: MailSettingsIn, _: str = Depends(admin)):
        for field in ("reply_to", "support_email"):
            value = getattr(body, field).strip()
            if value and not valid_email(value):
                raise HTTPException(400, "이메일 주소 형식을 확인해 주세요.")
        for field in ("download_windows", "download_mac"):
            value = getattr(body, field).strip()
            if value and not value.startswith("https://"):
                raise HTTPException(400, "설치 파일 링크는 https://로 시작해야 해요.")
        if body.relay_url.strip() and not body.relay_url.strip().startswith("https://script.google.com/"):
            raise HTTPException(400, "Apps Script 웹 앱 URL은 https://script.google.com/ 으로 시작해요.")
        store.save_settings({k: v.strip() if isinstance(v, str) else v for k, v in body.model_dump().items()})
        mailer.wake()
        return mail_status(_)

    @app.post("/api/mail/ping")
    def mail_ping(_: str = Depends(admin)):
        try:
            return transport.ping(store.settings())
        except MailError as e:
            raise HTTPException(400, str(e)) from e

    @app.post("/api/mail/test")
    def mail_test(body: TestMailIn, request: Request, _: str = Depends(admin)):
        """예시 라이선스로 안내 메일을 바로 보내 본다 (대기열을 거치지 않는다)."""
        if not valid_email(body.to):
            raise HTTPException(400, "받을 이메일 주소를 확인해 주세요.")
        cfg = store.settings()
        base = public_base(request)
        sample = {"license_id": "LB-예시-00000", "edition": "pro", "edition_label": "정품", "name": "테스트", "expires": None, "key": "LB1.예시.키"}
        links = {"key": f"{base}/", "guide": f"{base}/", "windows": cfg["download_windows"], "mac": cfg["download_mac"]}
        subject, html_body, text = license_mail(sample, links, cfg)
        row = {"to_addr": body.to.strip(), "subject": "[테스트] " + subject, "html": html_body, "text": text}
        try:
            transport.send(cfg, row, guide_attachment(GUIDE_PATH) if cfg["attach_guide"] else [])
        except MailError as e:
            raise HTTPException(400, str(e)) from e
        return {"ok": True}

    @app.get("/api/mail/preview")
    def mail_preview(request: Request, _: str = Depends(admin)):
        cfg = store.settings()
        base = public_base(request)
        sample = {"license_id": "LB-2026-00001", "edition": "pro", "edition_label": "정품", "name": "홍길동", "expires": None, "key": "LB1.예시.키"}
        links = {"key": f"{base}/k/예시", "guide": f"{base}/d/예시/guide", "windows": f"{base}/d/예시/windows" if cfg["download_windows"] else "",
                 "mac": f"{base}/d/예시/mac" if cfg["download_mac"] else ""}
        _, html_body, _ = license_mail(sample, links, cfg)
        # 메일 본문은 인라인 스타일이라 미리보기에서만 허용한다.
        return HTMLResponse(html_body, headers={"Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; img-src data:"})

    @app.get("/api/mail/outbox")
    def outbox(status: str = "", limit: int = 200, _: str = Depends(admin)):
        stmt = select(emails.c.id, emails.c.license_id, emails.c.kind, emails.c.to_addr, emails.c.subject, emails.c.status, emails.c.attempts,
                      emails.c.last_error, emails.c.created_at, emails.c.sent_at, emails.c.next_try_at).order_by(emails.c.id.desc()).limit(min(max(limit, 1), 1000))
        if status in ("queued", "sent", "failed"):
            stmt = stmt.where(emails.c.status == status)
        with engine.connect() as conn:
            rows = [dict(r._mapping) for r in conn.execute(stmt)]
        for r in rows:
            for k in ("created_at", "sent_at", "next_try_at"):
                r[k] = _iso(r[k])
        return rows

    @app.post("/api/mail/{email_id}/retry")
    def retry(email_id: int, _: str = Depends(admin)):
        with engine.begin() as conn:
            res = conn.execute(update(emails).where(emails.c.id == email_id, emails.c.status != "sent")
                               .values(status="queued", attempts=0, next_try_at=datetime.now(timezone.utc)))
            if res.rowcount == 0:
                raise HTTPException(404, "다시 보낼 메일이 없어요.")
        mailer.wake()
        return {"ok": True}

    @app.post("/api/licenses/{license_id}/send")
    def send_license(license_id: str, request: Request, _: str = Depends(admin)):
        remember_base(public_base(request))
        with engine.begin() as conn:
            lic = get_license(conn, license_id)
            if not lic:
                raise HTTPException(404, "라이선스를 찾을 수 없어요.")
            enqueue_license_mail(conn, lic, public_base(request))
            out = license_extras(conn, [lic])[0]
        mailer.wake()
        return out

    @app.post("/api/notices")
    def send_notice(body: NoticeIn, request: Request, _: str = Depends(admin)):
        """라이선스가 있는 사람 모두에게 공지 (취소된 라이선스는 뺀다, 같은 주소는 한 번만)."""
        cfg = store.settings()
        stmt = select(licenses.c.email).where(licenses.c.revoked_at.is_(None))
        if body.target in EDITIONS:
            stmt = stmt.where(licenses.c.edition == body.target)
        subject, html_body, text = notice_mail(body.subject, body.body, cfg)
        remember_base(public_base(request))
        with engine.begin() as conn:
            seen: set[str] = set()
            for (addr,) in conn.execute(stmt.order_by(licenses.c.id)):
                key = addr.strip().lower()
                if valid_email(addr) and key not in seen:
                    seen.add(key)
                    enqueue(conn, "notice", addr, subject, html_body, text)
        mailer.wake()
        return {"queued": len(seen)}

    @app.get("/mail/wake")
    def mail_wake():
        """Apps Script가 한 시간마다 불러 잠든 서버를 깨운다. 남은 메일 수만 알려 준다."""
        mailer.wake()
        return {"queued": store.queued_count()}

    # --- 고객이 메일 링크로 여는 곳 -------------------------------------------------
    def check_link(conn, license_id: str, token: str) -> dict:
        lic = get_license(conn, license_id)
        if not lic or not hmac.compare_digest(token, link_token(license_id)):
            raise HTTPException(404)
        return lic

    def support_line() -> str:
        cfg = store.settings()
        addr = cfg["support_email"] or cfg["reply_to"]
        return f'<p class="muted">문의: {html.escape(addr)}</p>' if addr else ""

    @app.get("/k/{license_id}/{token}")
    def key_page(license_id: str, token: str, request: Request, agree: str = ""):
        now = datetime.now(timezone.utc)
        with engine.begin() as conn:
            try:
                lic = check_link(conn, license_id, token)
            except HTTPException:
                return page("찾을 수 없음", "<h1>링크를 확인해 주세요</h1><p>주소가 잘못됐거나 만료된 링크예요.</p>", 404)
            if lic["revoked_at"]:
                return page("취소된 라이선스", f"<h1>취소된 라이선스예요</h1><p>{html.escape(lic['license_id'])}</p>{support_line()}", 410)
            viewed = conn.execute(select(key_views).where(key_views.c.license_id == license_id)).first()
            if not viewed and agree != "1":
                return page("라이선스 키 확인", (
                    f"<h1>{html.escape(lic['name'])}님의 라이선스 키</h1>"
                    "<p>키를 확인하면 디지털 콘텐츠 제공이 시작되어 <b>청약철회가 제한돼요</b>(전자상거래법 제17조 제2항 제5호). "
                    "키를 확인하기 전이라면 환불 정책에 따라 환불받을 수 있어요. 설치를 먼저 마치고 확인하셔도 돼요.</p>"
                    '<form method="get"><input type="hidden" name="agree" value="1">'
                    '<label class="check"><input type="checkbox" required> 위 내용을 확인했어요</label>'
                    '<button class="primary" type="submit">라이선스 키 보기</button></form>'
                    f"{support_line()}"
                ))
            if viewed:
                conn.execute(update(key_views).where(key_views.c.license_id == license_id).values(last_at=now, count=key_views.c.count + 1))
            else:
                conn.execute(key_views.insert().values(license_id=license_id, first_at=now, last_at=now, count=1, ip=client_ip(request)))
        cfg = store.settings()
        base = f"/d/{license_id}/{token}"
        links = "".join(
            f'<a class="button" href="{base}/{what}">{label}</a>'
            for what, label, on in (("windows", "Windows 설치 파일", cfg["download_windows"]), ("mac", "macOS 설치 파일", cfg["download_mac"]), ("guide", "사용 설명서", True))
            if on
        )
        return page("라이선스 키", (
            f"<h1>{html.escape(lic['name'])}님의 라이선스 키</h1>"
            f'<textarea id="key" readonly rows="7">{html.escape(lic["key"])}</textarea>'
            '<button id="copy" class="primary" type="button" hidden>키 복사</button>'
            "<p>키를 전부 복사해서, 로컬비서를 실행하면 나오는 입력 칸에 붙여 넣고 <b>등록하고 시작하기</b>를 누르세요.</p>"
            f'<p class="muted">{html.escape(lic["license_id"])} · {html.escape(lic["edition_label"])}'
            + (f" · {html.escape(lic['expires'])}까지" if lic["expires"] else "") + "</p>"
            f'<div class="links">{links}</div>{support_line()}'
        ))

    @app.get("/d/{license_id}/{token}/{what}")
    def download(license_id: str, token: str, what: str, request: Request):
        if what not in ("windows", "mac", "guide"):
            return page("찾을 수 없음", "<h1>찾을 수 없어요</h1>", 404)
        with engine.begin() as conn:
            try:
                lic = check_link(conn, license_id, token)
            except HTTPException:
                return page("찾을 수 없음", "<h1>링크를 확인해 주세요</h1><p>주소가 잘못됐거나 만료된 링크예요.</p>", 404)
            if lic["revoked_at"]:
                return page("취소된 라이선스", f"<h1>취소된 라이선스예요</h1>{support_line()}", 410)
            conn.execute(downloads.insert().values(license_id=license_id, what=what, at=datetime.now(timezone.utc), ip=client_ip(request)))
        if what == "guide":
            if not GUIDE_PATH.exists():
                return page("준비 중", f"<h1>사용 설명서를 준비하고 있어요</h1>{support_line()}", 404)
            return FileResponse(GUIDE_PATH, media_type="application/pdf", filename=GUIDE_NAME)
        target = store.settings()["download_windows" if what == "windows" else "download_mac"]
        if not target:
            return page("준비 중", f"<h1>설치 파일을 준비하고 있어요</h1><p>곧 다시 안내해 드릴게요.</p>{support_line()}", 404)
        return RedirectResponse(target, status_code=302)

    @app.get("/")
    def index():
        return FileResponse(HERE / "static" / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
    return app


def normalize_pem(value: str) -> str:
    """Render 입력 칸에 붙여 넣다 줄바꿈이 사라지거나(\\n, 공백) 머리글이 빠져도 PEM으로 되돌린다."""
    text = value.replace("\\n", "\n").strip().strip('"').strip("'")
    body = text.replace("-----BEGIN PRIVATE KEY-----", "").replace("-----END PRIVATE KEY-----", "")
    body = "".join(body.split())
    lines = [body[i : i + 64] for i in range(0, len(body), 64)]
    return "-----BEGIN PRIVATE KEY-----\n" + "\n".join(lines) + "\n-----END PRIVATE KEY-----\n"


def setup_needed_app(problems: list[str]) -> FastAPI:
    """설정이 덜 됐거나 잘못됐을 때 뜨는 안내 화면. 키를 발급하는 기능은 없다."""
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    items = "".join(f"<li>{html.escape(m)}</li>" for m in problems)
    page = (
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        "<title>설정 필요</title><body style=\"font-family:sans-serif;max-width:560px;margin:40px auto;padding:0 16px;line-height:1.6\">"
        "<h1>라이선스 서버 설정이 필요해요</h1>"
        "<p>Render 대시보드 → localbiseo-license → Environment에서 아래 값을 넣고 <b>Save, rebuild, and deploy</b>를 누르세요.</p>"
        f"<ul>{items}</ul></body>"
    )

    @app.get("/healthz")
    def healthz():
        return {"ok": False, "problems": problems}

    @app.api_route("/{path:path}", methods=["GET", "HEAD"])
    def notice(path: str):
        return Response(page, media_type="text/html; charset=utf-8", status_code=503)

    return app


def create_app_from_env() -> FastAPI:
    raw_pem = os.environ.get("LICENSE_PRIVATE_KEY", "")
    pin = os.environ.get("ADMIN_PIN", "").strip()
    problems = []
    if not pin:
        problems.append("ADMIN_PIN: 관리자 번호가 없어요.")
    if not raw_pem.strip():
        problems.append("LICENSE_PRIVATE_KEY: 서명 개인키(private.pem 파일 내용 전체)가 없어요.")
    if problems:
        return setup_needed_app(problems)
    try:
        return create_app(pin, normalize_pem(raw_pem), os.environ.get("DATABASE_URL", "").strip() or None)
    except (ValueError, TypeError, RuntimeError) as e:
        return setup_needed_app([f"설정값이 올바르지 않아요: {e}"])
