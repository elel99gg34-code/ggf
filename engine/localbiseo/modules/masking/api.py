from __future__ import annotations

import csv
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ...core.context import Ctx, job_ref
from ...core.errors import AppError
from .detect import DEFAULT_KINDS, KIND_LABELS, MODES, custom_words, mask_text
from .files import SUPPORTED_EXTS, mask_file

router = APIRouter(prefix="/mask", tags=["개인정보 마스킹"])


class TextIn(BaseModel):
    text: str
    kinds: list[str] | None = None
    mode: str = "partial"
    always: list[str] = []  # 항상 가릴 말 (거래처 이름, 내부 코드명 등)
    never: list[str] = []  # 가리지 않을 말 (회사 대표번호, 우리 회사 주소 등)


class FilesIn(BaseModel):
    paths: list[str] = Field(min_length=1)
    kinds: list[str] | None = None
    mode: str = "partial"
    out_dir: str | None = None
    faces: bool = True
    always: list[str] = []
    never: list[str] = []
    report: bool = False


def _check(kinds: list[str] | None, mode: str) -> None:
    if mode not in MODES:
        raise AppError("가리는 방식은 partial, full, tag 중 하나여야 해요.")
    unknown = set(kinds or []) - set(KIND_LABELS)
    if unknown:
        raise AppError(f"알 수 없는 항목: {', '.join(sorted(unknown))}")


@router.get("/kinds")
def kinds():
    return {
        "kinds": [{"key": k, "label": v, "default": k in DEFAULT_KINDS} for k, v in KIND_LABELS.items() if k != "custom"],
        "extensions": sorted(SUPPORTED_EXTS),
    }


@router.post("/text")
def mask_text_api(body: TextIn):
    _check(body.kinds, body.mode)
    with custom_words(body.always, body.never):
        masked, findings = mask_text(body.text, body.kinds, body.mode)
    return {"masked": masked, "findings": [f.to_dict() for f in findings]}


def write_report(results: list[dict], folder: Path) -> Path:
    """파일별로 무엇을 몇 개 가렸는지 남기는 확인용 표. 가린 값 자체는 적지 않는다."""
    kinds = [k for k in KIND_LABELS if any(k in r.get("by_kind", {}) for r in results)]
    if any("face" in r.get("by_kind", {}) for r in results):
        kinds.append("face")
    folder.mkdir(parents=True, exist_ok=True)
    path = folder / f"마스킹_보고서_{datetime.now():%Y%m%d_%H%M%S}.csv"
    with path.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f)
        w.writerow(["원본 파일", "결과 파일", "가린 개수", *(KIND_LABELS.get(k, "얼굴") for k in kinds), "메모"])
        for r in results:
            name = Path(r["src"]).name
            if "error" in r:
                w.writerow([name, "", "", *("" for _ in kinds), r["error"]])
                continue
            by = r.get("by_kind", {})
            w.writerow([name, Path(r["dst"]).name, r.get("count", 0), *(by.get(k, 0) for k in kinds), r.get("note", "")])
    return path


def run_files(job, paths, kinds, mode, out_dir, faces, always=None, never=None, report=False):
    results = []
    for i, path in enumerate(paths):
        job.progress(i / len(paths), f"{i + 1}/{len(paths)} 처리 중")
        try:
            results.append(mask_file(path, kinds, mode, out_dir, faces, always, never))
        except AppError as e:
            results.append({"src": path, "error": e.message})
        except Exception as e:  # noqa: BLE001 - 파일 하나가 실패해도 나머지는 계속 처리한다
            results.append({"src": path, "error": f"처리하지 못했어요: {e}"})
    total = sum(r.get("count", 0) for r in results)
    out = {"results": results, "total": total}
    if report:
        out["report"] = str(write_report(results, Path(out_dir) if out_dir else Path(paths[0]).parent))
    return out


@router.post("/files")
def mask_files_api(body: FilesIn, ctx: Ctx):
    _check(body.kinds, body.mode)
    job = ctx.jobs.submit(
        "mask", f"파일 {len(body.paths)}개 마스킹", run_files, body.paths, body.kinds, body.mode, body.out_dir, body.faces,
        body.always, body.never, body.report,
    )
    return job_ref(job)
