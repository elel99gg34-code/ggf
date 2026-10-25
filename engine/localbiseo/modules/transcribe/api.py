from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ...core import license, optional, search
from ...core.config import sub_dir
from ...core.context import Ctx, job_ref
from ...core.db import Database, now_iso
from ...core.errors import AppError, NotFound
from ...core.korean import split_sentences
from ..actions import extract_actions
from ..masking.detect import mask_text
from ..notes import add_todo, find_open_todo
from ..schedule import parse_events
from . import export, stt
from .summary import summarize

router = APIRouter(tags=["회의록"])


def _row_to_dict(row: dict) -> dict:
    t = dict(row)
    t["segments"] = json.loads(t["segments"])
    t["speakers"] = json.loads(t.get("speakers") or "{}")
    t["summary"] = json.loads(t["summary"]) if t.get("summary") else []
    return t


def get_transcript(db: Database, tid: int) -> dict:
    row = db.one("SELECT * FROM transcripts WHERE id=?", (tid,))
    if not row:
        raise NotFound("회의록을 찾을 수 없어요.")
    return _row_to_dict(row)


def _index(db: Database, tid: int) -> None:
    t = get_transcript(db, tid)
    search.index(db, "transcript", tid, t["title"], export.full_text(t["segments"]) + "\n" + "\n".join(t["summary"]))


def save_transcript(db: Database, title: str, segments: list[dict], source_path: str | None, language: str | None, duration: float | None) -> int:
    text = export.full_text(segments)
    points = summarize(text)["points"] if text else []
    tid = db.insert(
        "INSERT INTO transcripts(title, source_path, language, duration, segments, summary, created_at) VALUES(?,?,?,?,?,?,?)",
        (title, source_path, language, duration, json.dumps(segments, ensure_ascii=False), json.dumps(points, ensure_ascii=False), now_iso()),
    )
    _index(db, tid)
    return tid


def _post_process(db: Database, tid: int, auto_todos: bool) -> dict:
    t = get_transcript(db, tid)
    text = "\n".join(s["text"] for s in t["segments"])
    actions = extract_actions(text)
    events = [e.to_dict() for e in parse_events(text)]
    added = []
    if auto_todos:
        added = [add_todo(db, a["text"], a["due"], a["assignee"], f"transcript:{tid}") for a in actions if not find_open_todo(db, a["text"])]
    return {"transcript_id": tid, "actions": actions, "events": events, "todos_added": len(added)}


def run_transcribe(job, db: Database, path: str, title: str, size: str, language: str | None, diarize: bool, max_speakers: int | None, auto_todos: bool):
    if not Path(path).exists():
        raise AppError(f"파일을 찾을 수 없어요: {path}")
    res = stt.transcribe(job, path, size, language)
    segments = res["segments"]
    if diarize and segments:
        segments = stt.diarize(job, path, segments, max_speakers)
    tid = save_transcript(db, title or Path(path).stem, segments, path, res["language"], res["duration"])
    return _post_process(db, tid, auto_todos)


class TranscribeIn(BaseModel):
    path: str
    title: str = ""
    model: str = "small"
    language: str | None = "ko"
    diarize: bool = False
    max_speakers: int | None = None
    auto_todos: bool = True


class TextIn(BaseModel):
    title: str = ""
    text: str
    auto_todos: bool = False


class UpdateIn(BaseModel):
    title: str | None = None
    segments: list[dict] | None = None
    speakers: dict | None = None
    summary: list[str] | None = None


class ExportIn(BaseModel):
    format: str = "docx"
    masked: bool = False
    timestamps: bool = True
    include_actions: bool = True
    out_path: str | None = None


class DownloadIn(BaseModel):
    size: str = "small"


@router.get("/transcribe/models")
def models():
    return {
        "available": optional.available("stt"),
        "diarize_available": optional.available("diarize"),
        "sizes": [{"key": k, "label": v} for k, v in stt.MODEL_SIZES.items()],
        "installed": stt.installed_models() if optional.available("stt") else [],
    }


@router.post("/transcribe/models/download")
def download(body: DownloadIn, ctx: Ctx):
    if body.size not in stt.MODEL_SIZES:
        raise AppError("알 수 없는 모델 크기예요.")
    optional.require("stt")
    return job_ref(ctx.jobs.submit("model", f"음성 모델({body.size}) 내려받기", stt.download_model, body.size))


@router.post("/transcribe")
def transcribe(body: TranscribeIn, ctx: Ctx):
    license.require_pro(ctx.db)
    optional.require("stt")
    if body.diarize:
        optional.require("diarize")
    if body.model not in stt.MODEL_SIZES:
        raise AppError("알 수 없는 모델 크기예요.")
    job = ctx.jobs.submit(
        "transcribe", f"회의록 만들기: {Path(body.path).name}", run_transcribe, ctx.db, body.path, body.title,
        body.model, body.language, body.diarize, body.max_speakers, body.auto_todos,
    )
    return job_ref(job)


@router.post("/transcribe/text")
def from_text(body: TextIn, ctx: Ctx):
    """녹음 없이 붙여넣은 글로 회의록을 만든다 (요약·할 일 추출용)."""
    segments = [{"start": 0, "end": 0, "text": s, "speaker": None} for _, _, s in split_sentences(body.text)]
    if not segments:
        raise AppError("내용이 비어 있어요.")
    tid = save_transcript(ctx.db, body.title or f"메모 {datetime.now():%m/%d %H:%M}", segments, None, "ko", None)
    return _post_process(ctx.db, tid, body.auto_todos)


@router.get("/transcripts")
def list_transcripts(ctx: Ctx):
    return ctx.db.query("SELECT id, title, source_path, duration, created_at FROM transcripts ORDER BY id DESC")


@router.get("/transcripts/{tid}")
def read(tid: int, ctx: Ctx):
    return get_transcript(ctx.db, tid)


@router.get("/transcripts/{tid}/insights")
def insights(tid: int, ctx: Ctx):
    t = get_transcript(ctx.db, tid)
    text = "\n".join(s["text"] for s in t["segments"])
    return {"actions": extract_actions(text), "events": [e.to_dict() for e in parse_events(text)]}


@router.put("/transcripts/{tid}")
def update(tid: int, body: UpdateIn, ctx: Ctx):
    get_transcript(ctx.db, tid)
    fields = {}
    if body.title is not None:
        fields["title"] = body.title
    if body.segments is not None:
        fields["segments"] = json.dumps(body.segments, ensure_ascii=False)
    if body.speakers is not None:
        fields["speakers"] = json.dumps(body.speakers, ensure_ascii=False)
    if body.summary is not None:
        fields["summary"] = json.dumps(body.summary, ensure_ascii=False)
    if fields:
        ctx.db.execute(f"UPDATE transcripts SET {', '.join(f'{k}=?' for k in fields)} WHERE id=?", (*fields.values(), tid))
        _index(ctx.db, tid)
    return get_transcript(ctx.db, tid)


@router.post("/transcripts/{tid}/summarize")
def resummarize(tid: int, ctx: Ctx):
    t = get_transcript(ctx.db, tid)
    res = summarize(export.full_text(t["segments"]))
    ctx.db.execute("UPDATE transcripts SET summary=? WHERE id=?", (json.dumps(res["points"], ensure_ascii=False), tid))
    _index(ctx.db, tid)
    return res


@router.delete("/transcripts/{tid}")
def delete(tid: int, ctx: Ctx):
    ctx.db.execute("DELETE FROM transcripts WHERE id=?", (tid,))
    search.remove(ctx.db, "transcript", tid)
    return {"ok": True}


def _masked_copy(t: dict) -> dict:
    t = dict(t)
    t["segments"] = [{**s, "text": mask_text(s["text"])[0]} for s in t["segments"]]
    t["summary"] = [mask_text(p)[0] for p in t["summary"]]
    t["title"] = mask_text(t["title"])[0]
    return t


@router.post("/transcripts/{tid}/export")
def export_api(tid: int, body: ExportIn, ctx: Ctx):
    if body.format not in export.FORMATS:
        raise AppError(f"형식은 {', '.join(export.FORMATS)} 중 하나예요.")
    t = get_transcript(ctx.db, tid)
    actions = extract_actions("\n".join(s["text"] for s in t["segments"])) if body.include_actions else None
    if body.masked:
        t = _masked_copy(t)
        if actions:
            actions = [{**a, "text": mask_text(a["text"])[0]} for a in actions]
    if body.out_path:
        path = Path(body.out_path)
    else:
        safe = "".join(c for c in (t["title"] or "회의록") if c not in '\\/:*?"<>|').strip() or "회의록"
        path = sub_dir("exports") / f"{safe}{'_마스킹' if body.masked else ''}.{body.format}"
    path.parent.mkdir(parents=True, exist_ok=True)
    if body.format == "docx":
        export.to_docx(t, path, actions)
    else:
        content = {
            "txt": lambda: export.to_txt(t, body.timestamps),
            "md": lambda: export.to_md(t, actions),
            "srt": lambda: export.to_srt(t["segments"], t["speakers"]),
            "vtt": lambda: export.to_vtt(t["segments"], t["speakers"]),
        }[body.format]()
        path.write_text(content, encoding="utf-8")
    return {"path": str(path)}
