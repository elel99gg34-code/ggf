"""파일 이름 일괄 변경. 미리보기 → 적용 → 되돌리기."""
from __future__ import annotations

import json
import re
import uuid
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ..core.context import Ctx
from ..core.db import Database, now_iso
from ..core.errors import AppError, NotFound

router = APIRouter(prefix="/rename", tags=["이름 일괄 변경"])

INVALID = re.compile(r'[\\/:*?"<>|\x00-\x1f]')
TOKEN_RE = re.compile(r"\{(name|ext|parent|n|date|today|exif)(?::([^}]*))?\}")


class Rules(BaseModel):
    template: str = "{name}"  # {name} {ext} {parent} {n:03} {date:%Y%m%d} {today:%Y%m%d} {exif:%Y%m%d}
    find: str = ""
    replace: str = ""
    regex: bool = False
    case: str = "none"  # none | lower | upper
    spaces: str = "keep"  # keep | underscore | dash | remove
    start: int = 1
    step: int = 1
    sort: str = "name"  # name | mtime | size


def _exif_date(path: Path) -> datetime | None:
    try:
        from PIL import Image

        with Image.open(path) as im:
            exif = im.getexif()
            raw = exif.get_ifd(0x8769).get(36867) or exif.get(306)  # DateTimeOriginal, DateTime
        return datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S") if raw else None
    except Exception:  # noqa: BLE001 - 사진이 아니거나 EXIF가 없음
        return None


def _render(template: str, path: Path, n: int) -> str:
    def repl(m: re.Match) -> str:
        key, fmt = m.group(1), m.group(2)
        if key == "name":
            return path.stem
        if key == "ext":
            return path.suffix.lstrip(".")
        if key == "parent":
            return path.parent.name
        if key == "n":
            width = int(fmt) if fmt and fmt.isdigit() else len(fmt or "") or 1
            return str(n).zfill(width)
        if key == "date":
            return datetime.fromtimestamp(path.stat().st_mtime).strftime(fmt or "%Y%m%d")
        if key == "today":
            return datetime.now().strftime(fmt or "%Y%m%d")
        if key == "exif":
            d = _exif_date(path) or datetime.fromtimestamp(path.stat().st_mtime)
            return d.strftime(fmt or "%Y%m%d")
        return m.group(0)

    return TOKEN_RE.sub(repl, template)


def _sorted(paths: list[Path], key: str) -> list[Path]:
    if key == "mtime":
        return sorted(paths, key=lambda p: p.stat().st_mtime)
    if key == "size":
        return sorted(paths, key=lambda p: p.stat().st_size)
    return sorted(paths, key=lambda p: [int(t) if t.isdigit() else t.lower() for t in re.split(r"(\d+)", p.name)])


def plan(paths: list[str], rules: Rules) -> list[dict]:
    files = [Path(p) for p in paths]
    missing = [str(p) for p in files if not p.is_file()]
    if missing:
        raise AppError(f"파일을 찾을 수 없어요: {missing[0]}")
    out = []
    n = rules.start
    targets: dict[str, int] = {}
    for f in _sorted(files, rules.sort):
        stem = _render(rules.template, f, n)
        if rules.find:
            try:
                stem = re.sub(rules.find, rules.replace, stem) if rules.regex else stem.replace(rules.find, rules.replace)
            except re.error as e:
                raise AppError(f"정규식이 올바르지 않아요: {e}") from e
        if rules.case == "lower":
            stem = stem.lower()
        elif rules.case == "upper":
            stem = stem.upper()
        stem = {"underscore": stem.replace(" ", "_"), "dash": stem.replace(" ", "-"), "remove": stem.replace(" ", "")}.get(rules.spaces, stem)
        stem = INVALID.sub("_", stem).strip(" .") or f.stem
        ext = "" if "{ext}" in rules.template else f.suffix
        dst = f.with_name(stem + ext)
        key = str(dst).lower()
        targets[key] = targets.get(key, 0) + 1
        out.append({"src": str(f), "dst": str(dst), "changed": dst.name != f.name})
        n += rules.step
    sources = {r["src"].lower() for r in out}
    for r in out:
        dup = targets[r["dst"].lower()] > 1
        exists = Path(r["dst"]).exists() and r["dst"].lower() not in sources
        r["conflict"] = "같은 이름이 겹쳐요" if dup else ("이미 있는 파일이에요" if exists else None)
    return out


def apply(db: Database, items: list[dict]) -> dict:
    todo = [i for i in items if i["src"] != i["dst"]]
    if any(i.get("conflict") for i in items):
        raise AppError("이름이 겹치는 항목이 있어요. 미리보기를 확인해 주세요.")
    # 서로 이름을 바꾸는 경우(a→b, b→a)를 위해 임시 이름을 거친다.
    temp = []
    done = []
    try:
        for i in todo:
            src = Path(i["src"])
            tmp = src.with_name(f".lb_{uuid.uuid4().hex[:8]}{src.suffix}")
            src.rename(tmp)
            temp.append((tmp, i))
        for tmp, i in temp:
            tmp.rename(i["dst"])
            done.append({"src": i["src"], "dst": i["dst"]})
    except OSError as e:
        for tmp, i in temp:
            if tmp.exists():
                tmp.rename(i["src"])
        for d in done:
            if Path(d["dst"]).exists():
                Path(d["dst"]).rename(d["src"])
        raise AppError(f"이름을 바꾸지 못했어요: {e}") from e
    op_id = db.insert("INSERT INTO file_ops(kind, payload, created_at) VALUES('rename', ?, ?)", (json.dumps(done, ensure_ascii=False), now_iso()))
    return {"op_id": op_id, "renamed": len(done)}


def undo(db: Database, op_id: int) -> dict:
    op = db.one("SELECT * FROM file_ops WHERE id=? AND kind='rename'", (op_id,))
    if not op:
        raise NotFound("되돌릴 기록이 없어요.")
    if op["undone"]:
        raise AppError("이미 되돌렸어요.")
    items = json.loads(op["payload"])
    restored, failed = 0, []
    for d in reversed(items):
        try:
            if Path(d["src"]).exists():
                failed.append(d["src"])
                continue
            Path(d["dst"]).rename(d["src"])
            restored += 1
        except OSError:
            failed.append(d["dst"])
    db.execute("UPDATE file_ops SET undone=1 WHERE id=?", (op_id,))
    return {"restored": restored, "failed": failed}


class PlanIn(BaseModel):
    paths: list[str] = Field(min_length=1)
    rules: Rules = Rules()


class ApplyIn(BaseModel):
    items: list[dict]


@router.post("/plan")
def plan_api(body: PlanIn):
    return {"items": plan(body.paths, body.rules)}


@router.post("/apply")
def apply_api(body: ApplyIn, ctx: Ctx):
    return apply(ctx.db, body.items)


@router.post("/undo/{op_id}")
def undo_api(op_id: int, ctx: Ctx):
    return undo(ctx.db, op_id)


@router.get("/history")
def history(ctx: Ctx):
    rows = ctx.db.query("SELECT * FROM file_ops WHERE kind='rename' ORDER BY id DESC LIMIT 20")
    return [{"id": r["id"], "created_at": r["created_at"], "undone": bool(r["undone"]), "count": len(json.loads(r["payload"]))} for r in rows]
