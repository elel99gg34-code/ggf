"""상태, 설정, 라이선스, 작업 목록, 홈 화면 요약."""
from __future__ import annotations

import platform
import sys

from fastapi import APIRouter
from pydantic import BaseModel

from .. import __version__
from ..core import ffmpeg, fonts, license, llm, ocr, optional
from ..core.context import Ctx
from ..core.errors import NotFound

router = APIRouter(tags=["시스템"])

PUBLIC_SETTINGS = {"clipboard_enabled", "clipboard_sensitive", "default_out_dir", "whisper_model", "theme", "focus_minutes", "break_minutes", "user_name", "company"}


class LicenseIn(BaseModel):
    key: str


@router.get("/health")
def health():
    return {"ok": True, "version": __version__}


@router.get("/system/status")
def status(ctx: Ctx):
    return {
        "version": __version__,
        "python": sys.version.split()[0],
        "os": f"{platform.system()} {platform.release()}",
        "data_dir": str(ctx.data_dir),
        "components": optional.status(),
        "ffmpeg": ffmpeg.find_ffmpeg() is not None,
        "ocr_backend": ocr.backend_name(),
        "korean_font": fonts.korean_font_path(),
        "llm_model": str(llm.model_file()) if llm.model_file() else None,
        "search_tokenizer": ctx.db.fts_tokenizer,
        "license": license.state(ctx.db),
    }


@router.get("/system/settings")
def get_settings(ctx: Ctx):
    return {k: v for k, v in ctx.db.all_settings().items() if k in PUBLIC_SETTINGS}


@router.put("/system/settings")
def put_settings(body: dict, ctx: Ctx):
    for k, v in body.items():
        if k in PUBLIC_SETTINGS:
            ctx.db.set_setting(k, v)
    return get_settings(ctx)


@router.get("/license")
def get_license(ctx: Ctx):
    return license.state(ctx.db)


@router.post("/license")
def activate(body: LicenseIn, ctx: Ctx):
    return license.activate(ctx.db, body.key)


@router.get("/dashboard")
def dashboard(ctx: Ctx):
    db = ctx.db
    return {
        "todos_open": db.scalar("SELECT count(*) FROM todos WHERE done=0"),
        "todos_due_today": db.scalar("SELECT count(*) FROM todos WHERE done=0 AND due <= date('now','localtime')"),
        "notes": db.scalar("SELECT count(*) FROM notes"),
        "clips": db.scalar("SELECT count(*) FROM clips"),
        "transcripts": db.scalar("SELECT count(*) FROM transcripts"),
        "contacts": db.scalar("SELECT count(*) FROM contacts"),
        "focus_today": round(
            db.scalar(
                "SELECT coalesce(sum((julianday(ended_at)-julianday(started_at))*1440),0) FROM focus_sessions "
                "WHERE kind='focus' AND ended_at IS NOT NULL AND date(started_at)=date('now','localtime')"
            )
            or 0
        ),
        "recent_transcripts": db.query("SELECT id, title, created_at FROM transcripts ORDER BY id DESC LIMIT 5"),
        "upcoming_todos": db.query("SELECT * FROM todos WHERE done=0 ORDER BY due IS NULL, due, id DESC LIMIT 6"),
        "license": license.state(db),
    }


@router.get("/jobs")
def jobs(ctx: Ctx):
    return [j.to_dict() for j in ctx.jobs.list()[:50]]


@router.get("/jobs/{job_id}")
def job(job_id: str, ctx: Ctx):
    j = ctx.jobs.get(job_id)
    if not j:
        raise NotFound("작업을 찾을 수 없어요.")
    return j.to_dict()


@router.post("/jobs/{job_id}/cancel")
def cancel(job_id: str, ctx: Ctx):
    return {"cancelled": ctx.jobs.cancel(job_id)}
