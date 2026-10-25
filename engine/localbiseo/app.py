from __future__ import annotations

import secrets
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from . import __version__
from .core.config import data_dir as default_data_dir
from .core.context import AppContext
from .core.db import Database
from .core.errors import AppError
from .core.jobs import JobManager
from .modules import (
    actions, clipboard, dedupe, focus, media, notes, papers, pdf_tools, rename, schedule, screen_ocr, search_api, system,
    translate, writing,
)
from .modules.masking import api as masking
from .modules.transcribe import api as transcribe

ALLOWED_ORIGINS = [
    "tauri://localhost",
    "http://tauri.localhost",
    "https://tauri.localhost",
    "http://localhost:1420",
    "http://127.0.0.1:1420",
]
OPEN_PATHS = {"/health"}

ROUTERS = [
    system.router, masking.router, transcribe.router, media.router, actions.router, schedule.router, notes.router,
    clipboard.router, screen_ocr.router, papers.router, translate.router, writing.router, rename.router, dedupe.router,
    pdf_tools.router, focus.router, search_api.router,
]


def create_app(token: str | None = None, data_dir: Path | None = None, extra_origins: list[str] | None = None) -> FastAPI:
    root = data_dir or default_data_dir()
    root.mkdir(parents=True, exist_ok=True)
    ctx = AppContext(db=Database(root / "localbiseo.db"), jobs=JobManager(), data_dir=root)

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        yield
        ctx.jobs.shutdown()
        ctx.db.close()

    app = FastAPI(title="로컬비서 엔진", version=__version__, docs_url="/docs" if token is None else None, redoc_url=None, lifespan=lifespan)
    app.state.ctx = ctx
    app.state.token = token

    @app.middleware("http")
    async def auth(request: Request, call_next):
        # 다른 웹사이트가 localhost 엔진을 부르지 못하도록 앱 셸이 준 토큰을 확인한다.
        if token and request.method != "OPTIONS" and request.url.path not in OPEN_PATHS:
            given = request.headers.get("x-biseo-token", "")
            if not secrets.compare_digest(given, token):
                return JSONResponse({"error": "인증 실패"}, status_code=401)
        return await call_next(request)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=ALLOWED_ORIGINS + (extra_origins or []),
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.exception_handler(AppError)
    async def app_error(_: Request, exc: AppError):
        return JSONResponse(exc.to_dict(), status_code=exc.status)

    @app.exception_handler(RequestValidationError)
    async def validation_error(_: Request, exc: RequestValidationError):
        first = exc.errors()[0] if exc.errors() else {}
        where = ".".join(str(x) for x in first.get("loc", [])[1:])
        return JSONResponse({"error": f"입력값을 확인해 주세요: {where} ({first.get('msg', '')})"}, status_code=422)

    for router in ROUTERS:
        app.include_router(router)
    return app
