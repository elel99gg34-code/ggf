"""통합 검색: 메모, 할 일, 클립보드, 회의록, 연락처, 색인한 폴더의 문서."""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from ..core import search
from ..core.context import Ctx, job_ref
from ..core.db import Database
from ..core.errors import AppError
from ..core.extract import DOC_EXTS, extract_text
from ..core.jobs import JobContext

router = APIRouter(prefix="/search", tags=["통합 검색"])

MAX_FILE_BYTES = 30 * 1024 * 1024


def index_folder(job: JobContext, db: Database, folder: str) -> dict:
    root = Path(folder)
    if not root.is_dir():
        raise AppError(f"폴더를 찾을 수 없어요: {folder}")
    files = []
    for cur, dirs, names in os.walk(root):
        dirs[:] = [d for d in dirs if not d.startswith(".") and d not in ("node_modules", "__pycache__")]
        files += [Path(cur) / n for n in names if Path(n).suffix.lower() in DOC_EXTS]
    indexed, failed = 0, 0
    for i, f in enumerate(files):
        if i % 5 == 0:
            job.progress(i / max(len(files), 1), f"{i}/{len(files)} {f.name}")
        try:
            if f.stat().st_size > MAX_FILE_BYTES:
                continue
            text = extract_text(f)
            search.index(db, "file", str(f), f.name, text[:200_000])
            indexed += 1
        except Exception:  # noqa: BLE001 - 읽을 수 없는 파일은 건너뛴다
            failed += 1
    folders = set(db.get_setting("indexed_folders", []))
    folders.add(str(root))
    db.set_setting("indexed_folders", sorted(folders))
    return {"indexed": indexed, "failed": failed, "total": len(files)}


class IndexIn(BaseModel):
    folder: str


@router.get("")
def query(ctx: Ctx, q: str, kinds: str = "", limit: int = 40):
    kind_list = [k for k in kinds.split(",") if k] or None
    return {"results": search.query(ctx.db, q, kind_list, limit)}


@router.post("/index-folder")
def index_api(body: IndexIn, ctx: Ctx):
    return job_ref(ctx.jobs.submit("index", f"폴더 색인: {Path(body.folder).name}", index_folder, ctx.db, body.folder))


@router.get("/folders")
def folders(ctx: Ctx):
    count = ctx.db.scalar("SELECT count(*) FROM search_index WHERE kind='file'")
    return {"folders": ctx.db.get_setting("indexed_folders", []), "files": count}


@router.post("/reindex")
def reindex(ctx: Ctx):
    folders = ctx.db.get_setting("indexed_folders", [])
    ctx.db.execute("DELETE FROM search_index WHERE kind='file'")
    jobs = [ctx.jobs.submit("index", f"폴더 색인: {Path(f).name}", index_folder, ctx.db, f) for f in folders if Path(f).is_dir()]
    return {"jobs": [j.id for j in jobs]}
