from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ...core import license
from ...core.context import Ctx, job_ref
from ...core.errors import AppError
from .detect import DEFAULT_KINDS, KIND_LABELS, MODES, mask_text
from .files import SUPPORTED_EXTS, mask_file

router = APIRouter(prefix="/mask", tags=["개인정보 마스킹"])


class TextIn(BaseModel):
    text: str
    kinds: list[str] | None = None
    mode: str = "partial"


class FilesIn(BaseModel):
    paths: list[str] = Field(min_length=1)
    kinds: list[str] | None = None
    mode: str = "partial"
    out_dir: str | None = None
    faces: bool = True


def _check(kinds: list[str] | None, mode: str) -> None:
    if mode not in MODES:
        raise AppError("가리는 방식은 partial, full, tag 중 하나여야 해요.")
    unknown = set(kinds or []) - set(KIND_LABELS)
    if unknown:
        raise AppError(f"알 수 없는 항목: {', '.join(sorted(unknown))}")


@router.get("/kinds")
def kinds():
    return {
        "kinds": [{"key": k, "label": v, "default": k in DEFAULT_KINDS} for k, v in KIND_LABELS.items()],
        "extensions": sorted(SUPPORTED_EXTS),
    }


@router.post("/text")
def mask_text_api(body: TextIn):
    _check(body.kinds, body.mode)
    masked, findings = mask_text(body.text, body.kinds, body.mode)
    return {"masked": masked, "findings": [f.to_dict() for f in findings]}


def run_files(job, paths, kinds, mode, out_dir, faces):
    results = []
    for i, path in enumerate(paths):
        job.progress(i / len(paths), f"{i + 1}/{len(paths)} 처리 중")
        try:
            results.append(mask_file(path, kinds, mode, out_dir, faces))
        except AppError as e:
            results.append({"src": path, "error": e.message})
    total = sum(r.get("count", 0) for r in results)
    return {"results": results, "total": total}


@router.post("/files")
def mask_files_api(body: FilesIn, ctx: Ctx):
    _check(body.kinds, body.mode)
    license.require_pro(ctx.db)
    job = ctx.jobs.submit("mask", f"파일 {len(body.paths)}개 마스킹", run_files, body.paths, body.kinds, body.mode, body.out_dir, body.faces)
    return job_ref(job)
