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
import io
import json
import os
import secrets
import threading
import time
from datetime import date, datetime, timezone
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey
from fastapi import Depends, FastAPI, HTTPException, Request, Response
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sqlalchemy import Column, Date, DateTime, Integer, MetaData, String, Table, Text, create_engine, or_, select, update

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


class BulkIn(BaseModel):
    csv: str = Field(max_length=2_000_000)
    edition: str = "pro"
    expires: date | None = None


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
        "issued_at": d["issued_at"].astimezone(timezone.utc).isoformat(timespec="seconds"),
        "revoked_at": d["revoked_at"].astimezone(timezone.utc).isoformat(timespec="seconds") if d["revoked_at"] else None,
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


def create_app(pin: str, private_key_pem: str, db_url: str | None = None) -> FastAPI:
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

    app = FastAPI(title="로컬비서 라이선스 발급", docs_url=None, redoc_url=None, openapi_url=None)
    app.state.guard = guard

    @app.middleware("http")
    async def headers(request: Request, call_next):
        res = await call_next(request)
        res.headers["X-Frame-Options"] = "DENY"
        res.headers["X-Content-Type-Options"] = "nosniff"
        res.headers["Referrer-Policy"] = "no-referrer"
        res.headers["Content-Security-Policy"] = "default-src 'self'; frame-ancestors 'none'"
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
            return [_row(r) for r in conn.execute(stmt)]

    @app.post("/api/licenses")
    def create_license(body: IssueIn, _: str = Depends(admin)):
        with engine.begin() as conn:
            return issue(conn, body)

    @app.post("/api/licenses/bulk")
    def bulk(body: BulkIn, _: str = Depends(admin)):
        people = parse_people(body.csv)
        missing = [i + 1 for i, p in enumerate(people) if not p["name"]]
        if not people:
            raise HTTPException(400, "명단이 비어 있어요.")
        if missing:
            raise HTTPException(400, f"이름이 빈 줄이 있어요: {', '.join(map(str, missing[:10]))}번째")
        if len(people) > 5000:
            raise HTTPException(400, "한 번에 5,000명까지 발급할 수 있어요.")
        with engine.begin() as conn:
            return [issue(conn, IssueIn(edition=body.edition, expires=body.expires, **p)) for p in people]

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
        w.writerow(["라이선스 번호", "종류", "이름", "이메일", "주문번호", "메모", "기한", "발급일(UTC)", "취소일(UTC)", "취소 사유", "라이선스 키"])
        with engine.connect() as conn:
            for r in conn.execute(select(licenses).order_by(licenses.c.id)):
                d = _row(r)
                w.writerow([d["license_id"], d["edition_label"], d["name"], d["email"], d["order_no"], d["memo"], d["expires"] or "",
                            d["issued_at"], d["revoked_at"] or "", d["revoke_reason"], d["key"]])
        name = f"licenses-{date.today().isoformat()}.csv"
        # 엑셀에서 한글이 깨지지 않게 BOM을 붙인다.
        return Response("﻿" + buf.getvalue(), media_type="text/csv; charset=utf-8", headers={"Content-Disposition": f'attachment; filename="{name}"'})

    @app.get("/")
    def index():
        return FileResponse(HERE / "static" / "index.html", headers={"Cache-Control": "no-store"})

    app.mount("/static", StaticFiles(directory=HERE / "static"), name="static")
    return app


def setup_needed_app(missing: list[str]) -> FastAPI:
    """설정이 덜 됐을 때 뜨는 안내 화면. 키를 발급하는 기능은 없다."""
    app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)
    items = "".join(f"<li><code>{m}</code></li>" for m in missing)
    page = (
        '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
        "<title>설정 필요</title><body style=\"font-family:sans-serif;max-width:560px;margin:40px auto;padding:0 16px;line-height:1.6\">"
        f"<h1>라이선스 서버 설정이 필요해요</h1><p>Render 대시보드의 Environment에서 아래 값을 넣으면 자동으로 다시 시작돼요.</p><ul>{items}</ul></body>"
    )

    @app.get("/healthz")
    def healthz():
        return {"ok": False, "missing": missing}

    @app.get("/{path:path}")
    def notice(path: str):
        return Response(page, media_type="text/html; charset=utf-8", status_code=503)

    return app


def create_app_from_env() -> FastAPI:
    pem = os.environ.get("LICENSE_PRIVATE_KEY", "").replace("\\n", "\n")
    pin = os.environ.get("ADMIN_PIN", "")
    missing = [name for name, value in (("ADMIN_PIN", pin), ("LICENSE_PRIVATE_KEY", pem.strip())) if not value]
    if missing:
        return setup_needed_app(missing)
    return create_app(pin, pem, os.environ.get("DATABASE_URL"))
