"""중복 파일·비슷한 사진 찾기. 지우지 않고 보관함으로 옮겨서 되돌릴 수 있게 한다."""
from __future__ import annotations

import hashlib
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from PIL import Image
from pydantic import BaseModel, Field

from ..core.config import sub_dir
from ..core.context import Ctx, job_ref
from ..core.db import Database, now_iso
from ..core.errors import AppError, NotFound
from ..core.jobs import JobContext

router = APIRouter(prefix="/dedupe", tags=["중복 정리"])

IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".heic", ".gif", ".tif", ".tiff"}
SKIP_DIRS = {".git", "node_modules", "$RECYCLE.BIN", "System Volume Information", ".Trash", "__pycache__"}


def _walk(dirs: list[str], min_size: int, exts: set[str] | None = None) -> list[Path]:
    out = []
    for d in dirs:
        root = Path(d)
        if not root.is_dir():
            raise AppError(f"폴더를 찾을 수 없어요: {d}")
        for cur, subdirs, files in os.walk(root):
            subdirs[:] = [s for s in subdirs if s not in SKIP_DIRS and not s.startswith(".")]
            for name in files:
                p = Path(cur) / name
                if exts and p.suffix.lower() not in exts:
                    continue
                try:
                    if p.is_file() and not p.is_symlink() and p.stat().st_size >= min_size:
                        out.append(p)
                except OSError:
                    continue
    return out


def _hash(path: Path, limit: int | None = None) -> str:
    h = hashlib.blake2b(digest_size=20)
    with path.open("rb") as f:
        if limit:
            h.update(f.read(limit))
        else:
            for chunk in iter(lambda: f.read(1 << 20), b""):
                h.update(chunk)
    return h.hexdigest()


def find_duplicates(job: JobContext, dirs: list[str], min_size: int = 1) -> dict:
    job.progress(0.02, "파일 목록 만드는 중")
    files = _walk(dirs, min_size)
    by_size: dict[int, list[Path]] = {}
    for f in files:
        by_size.setdefault(f.stat().st_size, []).append(f)
    candidates = [g for g in by_size.values() if len(g) > 1]
    total = sum(len(g) for g in candidates) or 1
    done = 0
    groups = []
    for group in candidates:
        by_head: dict[str, list[Path]] = {}
        for f in group:
            try:
                by_head.setdefault(_hash(f, 65536), []).append(f)
            except OSError:
                pass
        for same_head in by_head.values():
            if len(same_head) < 2:
                continue
            by_full: dict[str, list[Path]] = {}
            for f in same_head:
                try:
                    by_full.setdefault(_hash(f), []).append(f)
                except OSError:
                    pass
            for h, same in by_full.items():
                if len(same) > 1:
                    same.sort(key=lambda p: (p.stat().st_mtime, len(str(p))))
                    size = same[0].stat().st_size
                    groups.append({"hash": h, "size": size, "files": [_info(p) for p in same], "wasted": size * (len(same) - 1)})
        done += len(group)
        job.progress(0.05 + 0.95 * done / total, f"비교 중 {done}/{total}")
    groups.sort(key=lambda g: g["wasted"], reverse=True)
    return {"mode": "exact", "scanned": len(files), "groups": groups, "wasted": sum(g["wasted"] for g in groups)}


def _info(p: Path) -> dict:
    st = p.stat()
    return {"path": str(p), "size": st.st_size, "mtime": datetime.fromtimestamp(st.st_mtime).isoformat(timespec="seconds")}


def dhash(path: Path, size: int = 8) -> int:
    with Image.open(path) as im:
        im = im.convert("L").resize((size + 1, size), Image.Resampling.LANCZOS)
        px = list(im.getdata())
    bits = 0
    for row in range(size):
        for col in range(size):
            left = px[row * (size + 1) + col]
            right = px[row * (size + 1) + col + 1]
            bits = (bits << 1) | (left > right)
    return bits


def find_similar(job: JobContext, dirs: list[str], threshold: int = 6) -> dict:
    job.progress(0.02, "사진 목록 만드는 중")
    files = _walk(dirs, 1, IMAGE_EXTS)
    hashes: list[tuple[Path, int]] = []
    for i, f in enumerate(files):
        try:
            hashes.append((f, dhash(f)))
        except Exception:  # noqa: BLE001 - 열 수 없는 이미지
            pass
        if i % 20 == 0:
            job.progress(0.05 + 0.6 * i / max(len(files), 1), f"사진 분석 {i}/{len(files)}")
    parent = list(range(len(hashes)))

    def find(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    for i in range(len(hashes)):
        hi = hashes[i][1]
        for j in range(i + 1, len(hashes)):
            if (hi ^ hashes[j][1]).bit_count() <= threshold:
                parent[find(j)] = find(i)
        if i % 200 == 0:
            job.progress(0.65 + 0.35 * i / max(len(hashes), 1), "비슷한 사진 묶는 중")
    clusters: dict[int, list[Path]] = {}
    for idx, (p, _) in enumerate(hashes):
        clusters.setdefault(find(idx), []).append(p)
    groups = []
    for members in clusters.values():
        if len(members) > 1:
            infos = sorted((_info(p) for p in members), key=lambda x: x["size"], reverse=True)
            groups.append({"files": infos, "size": infos[0]["size"], "wasted": sum(x["size"] for x in infos[1:])})
    groups.sort(key=lambda g: g["wasted"], reverse=True)
    return {"mode": "similar", "scanned": len(files), "groups": groups, "wasted": sum(g["wasted"] for g in groups)}


def quarantine(db: Database, paths: list[str]) -> dict:
    box = sub_dir(datetime.now().strftime("%Y%m%d_%H%M%S"), sub_dir("보관함"))
    moved = []
    for i, p in enumerate(paths):
        src = Path(p)
        if not src.is_file():
            continue
        dst = box / f"{i:04d}_{src.name}"
        shutil.move(str(src), dst)
        moved.append({"src": str(src), "dst": str(dst)})
    op_id = db.insert("INSERT INTO file_ops(kind, payload, created_at) VALUES('quarantine', ?, ?)", (json.dumps(moved, ensure_ascii=False), now_iso()))
    return {"op_id": op_id, "moved": len(moved), "folder": str(box)}


def restore(db: Database, op_id: int) -> dict:
    op = db.one("SELECT * FROM file_ops WHERE id=? AND kind='quarantine'", (op_id,))
    if not op:
        raise NotFound("되돌릴 기록이 없어요.")
    if op["undone"]:
        raise AppError("이미 되돌렸어요.")
    restored, failed = 0, []
    for m in json.loads(op["payload"]):
        src, dst = Path(m["src"]), Path(m["dst"])
        if dst.exists() and not src.exists():
            src.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(dst), src)
            restored += 1
        else:
            failed.append(m["src"])
    db.execute("UPDATE file_ops SET undone=1 WHERE id=?", (op_id,))
    return {"restored": restored, "failed": failed}


class ScanIn(BaseModel):
    dirs: list[str] = Field(min_length=1)
    mode: str = "exact"  # exact | similar
    threshold: int = 6
    min_size: int = 1


class PathsIn(BaseModel):
    paths: list[str] = Field(min_length=1)


@router.post("/scan")
def scan(body: ScanIn, ctx: Ctx):
    if body.mode == "similar":
        job = ctx.jobs.submit("dedupe", "비슷한 사진 찾기", find_similar, body.dirs, body.threshold)
    else:
        job = ctx.jobs.submit("dedupe", "중복 파일 찾기", find_duplicates, body.dirs, body.min_size)
    return job_ref(job)


@router.post("/quarantine")
def quarantine_api(body: PathsIn, ctx: Ctx):
    return quarantine(ctx.db, body.paths)


@router.post("/restore/{op_id}")
def restore_api(op_id: int, ctx: Ctx):
    return restore(ctx.db, op_id)


@router.get("/history")
def history(ctx: Ctx):
    rows = ctx.db.query("SELECT * FROM file_ops WHERE kind='quarantine' ORDER BY id DESC LIMIT 20")
    return [{"id": r["id"], "created_at": r["created_at"], "undone": bool(r["undone"]), "count": len(json.loads(r["payload"]))} for r in rows]
